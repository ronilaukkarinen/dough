import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getYnabToken, getYnabBudgetId, getHouseholdSetting } from "@/lib/household";
import { DEFAULT_SUMMARY_INSTRUCTIONS } from "@/lib/ai/default-prompts";
import { getBudgetSummary, getTransactions, getMonthBudget } from "@/lib/ynab/client";
import { spawn } from "child_process";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "1";

    const db = getDb();

    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        locale TEXT NOT NULL DEFAULT 'en',
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    const requestLocale = url.searchParams.get("locale") || "en";

    // Check for cached summary (valid for 24 hours)
    if (!forceRefresh) {
      const cached = db
        .prepare("SELECT content, created_at FROM ai_summaries WHERE user_id = ? AND locale = ? ORDER BY created_at DESC LIMIT 1")
        .get(user.id, requestLocale) as { content: string; created_at: string } | undefined;

      if (cached) {
        const age = Date.now() - new Date(cached.created_at + "Z").getTime();
        const maxAge = 24 * 60 * 60 * 1000;
        if (age < maxAge) {
          console.debug("[summary] Returning cached", requestLocale, "summary, age:", Math.round(age / 60000), "min");
          return NextResponse.json({ summary: cached.content, cached: true });
        }
      }
    }

    console.info("[summary] Generating fresh AI summary for user", user.id);

    // Get YNAB data from household settings
    const token = getYnabToken();
    const budgetId = getYnabBudgetId();

    if (!token || !budgetId) {
      return NextResponse.json({ summary: null, error: "YNAB not connected" });
    }

    const now = new Date();
    const sinceDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const [summary, transactions, monthBudget] = await Promise.all([
      getBudgetSummary(budgetId, token),
      getTransactions(budgetId, sinceDate, token),
      getMonthBudget(budgetId, undefined, token),
    ]);

    const checkingSavings = summary.accounts
      .filter((a: any) => a.type === "checking" || a.type === "savings")
      .reduce((s: number, a: any) => s + a.balance, 0);

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate();
    // Filter out transfers for accurate income/expense
    const realExpenses = transactions.filter((t: any) => t.amount < 0 && !t.payee.startsWith("Transfer") && !t.payee.startsWith("Starting Balance") && !t.payee.startsWith("Reconciliation") && t.category !== "Uncategorized");
    const realIncome = transactions.filter((t: any) => t.amount > 0 && !t.payee.startsWith("Transfer") && !t.payee.startsWith("Starting Balance") && !t.payee.startsWith("Reconciliation"));
    const monthActivity = realExpenses.reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
    const monthIncomeTotal = realIncome.reduce((s: number, t: any) => s + t.amount, 0);

    const topExpenses = realExpenses
      .sort((a: any, b: any) => a.amount - b.amount)
      .slice(0, 5)
      .map((t: any) => `${t.payee}: ${Math.abs(t.amount).toFixed(0)} euros`)
      .join(", ");

    const lang = requestLocale === "fi"
      ? "Respond in Finnish."
      : "Respond in English.";

    const { getHouseholdSetting } = await import("@/lib/household");
    const householdProfile = getHouseholdSetting("household_profile") || "";

    const daysPassed = now.getDate();
    const dailyBurnRate = daysPassed > 0 ? Math.round(monthActivity / daysPassed) : 0;

    // Get income sources and bills from DB
    const incomeSources = db
      .prepare("SELECT name, amount, expected_day, is_active FROM income_sources WHERE is_active = 1 ORDER BY expected_day ASC")
      .all() as { name: string; amount: number; expected_day: number; is_active: number }[];

    const recurringBills = db
      .prepare("SELECT id, name, amount, due_day, is_active FROM recurring_bills WHERE is_active = 1 ORDER BY due_day ASC")
      .all() as { id: number; name: string; amount: number; due_day: number; is_active: number }[];

    const billMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const billMatches = db
      .prepare("SELECT source_id FROM monthly_matches WHERE source_type = 'bill' AND month = ?")
      .all(billMonth) as { source_id: number }[];
    const matchedBillIds = new Set(billMatches.map((m) => m.source_id));

    const upcomingIncome = incomeSources
      .filter((i) => i.expected_day > now.getDate())
      .reduce((s, i) => s + i.amount, 0);

    const totalExpectedMonthlyIncome = incomeSources.reduce((s, i) => s + i.amount, 0);

    const projectedMonthEnd = Math.round(checkingSavings + upcomingIncome - (dailyBurnRate * daysLeft));
    const livingAboveMeans = monthActivity > totalExpectedMonthlyIncome;

    // Category breakdown for spending tips
    const categoryBreakdown = monthBudget.categories
      .filter((c: { name: string; activity: number }) => c.activity < 0 && c.name !== "Inflow: Ready to Assign")
      .sort((a: { activity: number }, b: { activity: number }) => a.activity - b.activity)
      .slice(0, 8)
      .map((c: { name: string; activity: number }) => `${c.name}: ${Math.abs(c.activity).toFixed(0)} euros`)
      .join(", ");

    const incomeList = incomeSources.length > 0
      ? incomeSources.map((i) => `${i.name}: ${i.amount} euros (day ${i.expected_day})`).join(", ")
      : "No income sources configured";

    const summaryInstructions = getHouseholdSetting("prompt_summary_instructions") || DEFAULT_SUMMARY_INSTRUCTIONS;

    const prompt = `${lang} You are a personal finance advisor.${householdProfile ? ` Household: ${householdProfile}.` : ""} ${summaryInstructions}

IMPORTANT: Do NOT compare "received income so far" to "total expenses" to conclude they are overspending. Income arrives at specific dates (see below). Compare EXPECTED TOTAL monthly income to expenses for the full picture. The family may receive most income late in the month.

Data:
- Checking+savings balance: ${Math.round(checkingSavings)} euros
- Income ALREADY received this month: ${Math.round(monthIncomeTotal)} euros
- TOTAL expected monthly income (all sources): ${totalExpectedMonthlyIncome} euros
- Income still coming this month: ${Math.round(upcomingIncome)} euros (${incomeSources.filter((i) => i.expected_day > now.getDate()).map((i) => `${i.name}: ${i.amount} euros on day ${i.expected_day}`).join(", ") || "none"})
- Income sources: ${incomeList}
- This month's real spending (excluding transfers): ${Math.round(monthActivity)} euros
- Daily burn rate: ${dailyBurnRate} euros/day
- Projected month-end balance (with upcoming income): ${projectedMonthEnd} euros
- Living above means: ${livingAboveMeans ? "YES spending exceeds expected income" : "no"}
- Days passed: ${daysPassed}, days left: ${daysLeft}
- Daily budget from current balance: ${daysLeft > 0 ? Math.round(checkingSavings / daysLeft) : 0} euros/day
- Spending by category: ${categoryBreakdown}
- Top individual expenses: ${topExpenses}
- Recurring bills: ${recurringBills.length > 0 ? recurringBills.map((b) => {
      const isPaid = matchedBillIds.has(b.id);
      const isOverdue = !isPaid && b.due_day < now.getDate();
      return `${b.name}: ${b.amount} euros (due day ${b.due_day}${isPaid ? " - PAID" : isOverdue ? " - OVERDUE" : " - upcoming"})`;
    }).join(", ") : "none configured"}
- Total monthly bills: ${recurringBills.reduce((s, b) => s + b.amount, 0)} euros`;

    const claudePath = process.env.CLAUDE_PATH || "/home/rolle/.local/bin/claude";
    console.info("[summary] Calling claude CLI");

    const summaryText = await new Promise<string>((resolve, reject) => {
      const proc = spawn(claudePath, ["-p", "-"], {
        env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: "cli" },
        timeout: 120000,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

      proc.on("close", (code: number) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`claude exited with code ${code}: ${stderr}`));
        }
      });

      proc.on("error", reject);

      proc.stdin.write(prompt);
      proc.stdin.end();
    });

    if (summaryText) {
      db.prepare("INSERT INTO ai_summaries (user_id, locale, content) VALUES (?, ?, ?)")
        .run(user.id, requestLocale, summaryText);

      console.info("[summary] Summary generated and cached, length:", summaryText.length);
    }

    return NextResponse.json({ summary: summaryText, cached: false });
  } catch (error) {
    console.error("[summary] Error:", error);
    return NextResponse.json({ summary: null, error: "Failed to generate summary" }, { status: 500 });
  }
}
