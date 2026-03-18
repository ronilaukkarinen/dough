import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
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
    // Filter out transfers for accurate income/expense
    const realExpenses = transactions.filter((t: any) => t.amount < 0 && !t.payee.startsWith("Transfer") && t.category !== "Uncategorized");
    const realIncome = transactions.filter((t: any) => t.amount > 0 && !t.payee.startsWith("Transfer"));
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

    const daysPassed = now.getDate();
    const dailyBurnRate = daysPassed > 0 ? Math.round(monthActivity / daysPassed) : 0;
    const projectedMonthEnd = Math.round(checkingSavings - (dailyBurnRate * daysLeft));
    const livingAboveMeans = monthActivity > monthIncomeTotal;

    const prompt = `${lang} You are a personal finance advisor for a Finnish household. Write 1-4 sentences summarizing their current financial situation. Be direct, specific with numbers, and actionable. Use euro sign. No greeting, no bullet points, no markdown. If they are living above their means, say so clearly. Include projected month-end balance.

Data:
- Checking+savings balance: ${Math.round(checkingSavings)} euros
- This month's real income (excluding transfers): ${Math.round(monthIncomeTotal)} euros
- This month's real spending (excluding transfers): ${Math.round(monthActivity)} euros
- Daily burn rate: ${dailyBurnRate} euros/day
- Projected month-end balance at current pace: ${projectedMonthEnd} euros
- Living above means: ${livingAboveMeans ? "YES" : "no"}
- Days passed this month: ${daysPassed}
- Days left in month: ${daysLeft}
- Daily budget if spread evenly: ${daysLeft > 0 ? Math.round(checkingSavings / daysLeft) : 0} euros/day
- Top expenses: ${topExpenses}`;

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
