import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getYnabToken, getYnabBudgetId } from "@/lib/household";
import { DEFAULT_SUMMARY_INSTRUCTIONS } from "@/lib/ai/default-prompts";
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

    // Use cached data instead of calling YNAB API directly
    const cached = db.prepare("SELECT data FROM ynab_cache WHERE id = 1").get() as { data: string } | undefined;
    if (!cached) {
      return NextResponse.json({ summary: null, error: "No cached data. Sync first." });
    }
    const ynabData = JSON.parse(cached.data);
    const { summary, transactions, monthBudget } = ynabData;

    // Load historical monthly data for comparisons
    const billMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const historySnapshots = db
      .prepare("SELECT month, income, expenses FROM monthly_snapshots WHERE month < ? ORDER BY month DESC LIMIT 3")
      .all(billMonth) as { month: string; income: number; expenses: number }[];

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

    // Get income sources and bills from DB
    const incomeSources = db
      .prepare("SELECT name, amount, expected_day, is_active FROM income_sources WHERE is_active = 1 ORDER BY expected_day ASC")
      .all() as { name: string; amount: number; expected_day: number; is_active: number }[];

    const recurringBills = db
      .prepare("SELECT id, name, amount, due_day, is_active FROM recurring_bills WHERE is_active = 1 ORDER BY due_day ASC")
      .all() as { id: number; name: string; amount: number; due_day: number; is_active: number }[];

    const billMatches = db
      .prepare("SELECT source_id FROM monthly_matches WHERE source_type = 'bill' AND month = ?")
      .all(billMonth) as { source_id: number }[];
    const matchedBillIds = new Set(billMatches.map((m) => m.source_id));

    const upcomingIncome = incomeSources
      .filter((i) => i.expected_day > now.getDate())
      .reduce((s, i) => s + i.amount, 0);

    const totalExpectedMonthlyIncome = incomeSources.reduce((s, i) => s + i.amount, 0);

    // Better projection: separate bills from discretionary spending
    const totalBillsAmount = recurringBills.reduce((s, b) => s + b.amount, 0);
    const paidBillsAmount = recurringBills
      .filter((b) => matchedBillIds.has(b.id) || b.due_day < now.getDate())
      .reduce((s, b) => s + b.amount, 0);
    const unpaidBillsAmount = totalBillsAmount - paidBillsAmount;
    const discretionarySpending = Math.max(0, monthActivity - paidBillsAmount);
    const dailyDiscretionary = daysPassed > 0 ? Math.round((discretionarySpending / daysPassed) * 100) / 100 : 0;
    const projectedMonthEnd = Math.round(checkingSavings + upcomingIncome - unpaidBillsAmount - (dailyDiscretionary * daysLeft));

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

    // Get debts with overrides
    const debtOverrides = db.prepare("SELECT * FROM debt_overrides").all() as { ynab_account_id: string; interest_rate: number; minimum_payment: number; due_day: number }[];
    const debtOverrideMap: Record<string, { interest_rate: number; minimum_payment: number; due_day: number }> = {};
    for (const o of debtOverrides) debtOverrideMap[o.ynab_account_id] = o;

    const debtAccounts: { name: string; balance: number; rate: number; payment: number; dueDay: number }[] = summary.accounts
      .filter((a: any) => a.type === "otherDebt" && a.balance < 0)
      .map((a: any) => {
        const override = debtOverrideMap[a.id];
        return { name: a.name, balance: Math.abs(a.balance), rate: override?.interest_rate ?? 0, payment: override?.minimum_payment ?? 0, dueDay: override?.due_day ?? 0 };
      });

    // Get investment accounts with overrides
    const investOverrides = db.prepare("SELECT * FROM investment_overrides").all() as { ynab_account_id: string; monthly_contribution: number; expected_return: number }[];
    const investOverrideMap: Record<string, { monthly_contribution: number; expected_return: number }> = {};
    for (const o of investOverrides) investOverrideMap[o.ynab_account_id] = o;

    const investmentAccounts: { name: string; balance: number; monthly: number; returnPct: number }[] = summary.accounts
      .filter((a: any) => a.type === "otherAsset")
      .map((a: any) => {
        const override = investOverrideMap[a.id];
        return { name: a.name, balance: a.balance, monthly: override?.monthly_contribution ?? 0, returnPct: override?.expected_return ?? 7 };
      });

    const savingGoal = parseFloat(getHouseholdSetting("saving_rate") || "0");

    // Monthly debt and investment payments (same as dashboard)
    const totalDebtPayments = debtAccounts.reduce((s, d) => s + d.payment, 0);
    const totalInvestmentContributions = investmentAccounts.reduce((s: number, i: { monthly: number }) => s + i.monthly, 0);

    const summaryInstructions = getHouseholdSetting("prompt_summary_instructions") || DEFAULT_SUMMARY_INSTRUCTIONS;

    const projectedRemainingExpenses = Math.round(unpaidBillsAmount + (dailyDiscretionary * daysLeft));
    const projectedTotalExpenses = Math.round(monthActivity + projectedRemainingExpenses + totalInvestmentContributions + totalDebtPayments);

    // Daily budget matches dashboard: (balance - saving goal - unpaid bills - debts - investments) / days left
    const spendableBalance = Math.max(0, checkingSavings - savingGoal - unpaidBillsAmount - totalDebtPayments - totalInvestmentContributions);
    const dailyBudget = daysLeft > 0 ? Math.round((spendableBalance / daysLeft) * 100) / 100 : 0;

    const prompt = `${lang} You are a personal finance advisor.${householdProfile ? ` Household: ${householdProfile}.` : ""} ${summaryInstructions}

CRITICAL RULES:
- Use the PRE-CALCULATED projected month-end balance below. Do NOT calculate your own projection.
- The projection already accounts for: current balance + upcoming income - unpaid bills - projected discretionary spending.
- Income arrives at specific dates, not all at once. Do not treat upcoming income as already available.
- The daily burn rate EXCLUDES fixed bills (rent etc) - it only reflects discretionary spending like groceries, restaurants, transport.

Pre-calculated analysis:
- Current checking+savings balance: ${Math.round(checkingSavings)} euros
- Days passed: ${daysPassed}, days left in month: ${daysLeft}
- Income received so far: ${Math.round(monthIncomeTotal)} euros
- Income still coming: ${Math.round(upcomingIncome)} euros (${incomeSources.filter((i) => i.expected_day > now.getDate()).map((i) => `${i.name}: ${i.amount} euros on day ${i.expected_day}`).join(", ") || "none"})
- Total expected monthly income: ${totalExpectedMonthlyIncome} euros
- Spending so far this month: ${Math.round(monthActivity)} euros
- Of which fixed bills already paid: ${Math.round(paidBillsAmount)} euros
- Of which discretionary (groceries, restaurants, etc): ${Math.round(discretionarySpending)} euros
- Daily discretionary burn rate: ${dailyDiscretionary} euros/day
- Unpaid bills still due this month: ${Math.round(unpaidBillsAmount)} euros
- Projected remaining expenses (bills + discretionary): ${projectedRemainingExpenses} euros
- Projected TOTAL month expenses: ${projectedTotalExpenses} euros
- Monthly debt payments: ${totalDebtPayments} euros
- Monthly investment contributions: ${totalInvestmentContributions} euros${savingGoal > 0 ? `\n- Savings goal: ${savingGoal} euros/month` : ""}
- ** PROJECTED MONTH-END BALANCE: ${projectedMonthEnd} euros ** (USE THIS NUMBER, do not calculate your own)
- Monthly surplus/deficit: ${totalExpectedMonthlyIncome - projectedTotalExpenses} euros (income minus projected expenses)
- Daily budget (balance minus saving goal minus unpaid bills minus debts minus investments, divided by days left): ${dailyBudget} euros/day
- Spending by category: ${categoryBreakdown}
- Top individual expenses: ${topExpenses}
- Bills: ${recurringBills.length > 0 ? recurringBills.map((b) => {
      const isPaid = matchedBillIds.has(b.id);
      const isOverdue = !isPaid && b.due_day < now.getDate();
      return `${b.name}: ${b.amount} euros (due ${b.due_day}th${isPaid ? " - PAID" : isOverdue ? " - OVERDUE" : " - upcoming"})`;
    }).join(", ") : "none configured"}
- Total monthly bills: ${recurringBills.reduce((s, b) => s + b.amount, 0)} euros
- Income sources: ${incomeList}
- Debts: ${debtAccounts.length > 0 ? debtAccounts.map((d) => `${d.name}: ${d.balance} euros${d.rate > 0 ? ` (${d.rate}% APR)` : ""}${d.payment > 0 ? `, ${d.payment} euros/month` : ""}${d.dueDay > 0 ? ` (due ${d.dueDay}th)` : ""}`).join(", ") : "none"}
- Total debt: ${debtAccounts.reduce((s: number, d: { balance: number }) => s + d.balance, 0)} euros
- Investments: ${investmentAccounts.length > 0 ? investmentAccounts.map((i) => `${i.name}: ${i.balance} euros${i.monthly > 0 ? `, ${i.monthly} euros/month` : ""}${i.returnPct > 0 ? ` (${i.returnPct}% return)` : ""}`).join(", ") : "none"}
- Total investment value: ${investmentAccounts.reduce((s: number, i: { balance: number }) => s + i.balance, 0)} euros
- Monthly investment contributions: ${investmentAccounts.reduce((s: number, i: { monthly: number }) => s + i.monthly, 0)} euros
- Previous months: ${historySnapshots.length > 0 ? historySnapshots.map((s) => `${s.month}: income ${Math.round(s.income)} euros, expenses ${Math.round(s.expenses)} euros, net ${Math.round(s.income - s.expenses)} euros`).join("; ") : "no historical data yet"}`;

    const claudePath = process.env.CLAUDE_PATH || "claude";
    console.info("[summary] Calling claude CLI");

    const summaryText = await new Promise<string>((resolve, reject) => {
      const proc = spawn(claudePath, ["-p", "--model", "opus", "-"], {
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
