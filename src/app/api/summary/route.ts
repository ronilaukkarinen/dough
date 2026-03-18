import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getBudgetSummary, getTransactions, getMonthBudget } from "@/lib/ynab/client";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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

    // Get YNAB data
    const row = db
      .prepare("SELECT ynab_access_token, ynab_budget_id, locale FROM users WHERE id = ?")
      .get(user.id) as { ynab_access_token: string | null; ynab_budget_id: string | null; locale: string } | undefined;

    const token = row?.ynab_access_token;
    const budgetId = row?.ynab_budget_id;
    const locale = row?.locale || "en";

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
    const daysLeft = daysInMonth - now.getDate() + 1;
    const monthActivity = Math.abs(monthBudget.activity);
    const monthIncome = monthBudget.income;

    const topExpenses = transactions
      .filter((t: any) => t.amount < 0)
      .sort((a: any, b: any) => a.amount - b.amount)
      .slice(0, 5)
      .map((t: any) => `${t.payee}: ${Math.abs(t.amount).toFixed(0)} euros`)
      .join(", ");

    const lang = requestLocale === "fi"
      ? "Respond in Finnish."
      : "Respond in English.";

    const prompt = `${lang} You are a personal finance advisor for a Finnish household. Write 1-4 sentences summarizing their current financial situation. Be direct, specific with numbers, and actionable. Use euro sign. No greeting, no bullet points, no markdown.

Data:
- Checking+savings balance: ${Math.round(checkingSavings)} euros
- This month's income so far: ${Math.round(monthIncome)} euros
- This month's spending so far: ${Math.round(monthActivity)} euros
- Days left in month: ${daysLeft}
- Daily budget if spread evenly: ${daysLeft > 0 ? Math.round(checkingSavings / daysLeft) : 0} euros/day
- Top expenses: ${topExpenses}
- Total transactions this month: ${transactions.length}`;

    const claudePath = process.env.CLAUDE_PATH || "/home/rolle/.local/bin/claude";
    console.info("[summary] Calling claude CLI");

    const { stdout } = await execFileAsync(claudePath, ["-p", prompt], {
      timeout: 60000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: "cli" },
    });

    const summaryText = stdout.trim();

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
