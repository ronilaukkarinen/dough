import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getYnabToken, getYnabBudgetId } from "@/lib/household";
import { spawn } from "child_process";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ suggestion: null }, { status: 401 });

    const token = getYnabToken();
    const budgetId = getYnabBudgetId();
    if (!token || !budgetId) return NextResponse.json({ suggestion: null });

    console.info("[debts/suggestion] Fetching data for AI suggestion");

    const { getBudgetSummary } = await import("@/lib/ynab/client");
    const summary = await getBudgetSummary(budgetId, token);

    const debts = summary.accounts
      .filter((a: any) => a.type === "otherDebt" && a.balance < 0)
      .map((a: any) => `${a.name}: ${Math.abs(a.balance).toFixed(0)} euros`);

    if (debts.length === 0) return NextResponse.json({ suggestion: null });

    const lang = user.locale === "fi" ? "Respond in Finnish." : "Respond in English.";
    const prompt = `${lang} You are a debt advisor. Given these debts, suggest which to prioritize paying off and why. Be specific and actionable. 2-3 sentences max. No markdown.

Debts:
${debts.join("\n")}`;

    const claudePath = process.env.CLAUDE_PATH || "/home/rolle/.local/bin/claude";

    const suggestion = await new Promise<string>((resolve, reject) => {
      const proc = spawn(claudePath, ["-p", "-"], {
        env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: "cli" },
        timeout: 120000,
      });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });
      proc.on("close", (code: number) => {
        if (code === 0 && stdout.trim()) resolve(stdout.trim());
        else reject(new Error(`claude exited ${code}: ${stderr}`));
      });
      proc.on("error", reject);
      proc.stdin.write(prompt);
      proc.stdin.end();
    });

    console.info("[debts/suggestion] AI suggestion generated");
    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("[debts/suggestion] Error:", error);
    return NextResponse.json({ suggestion: null }, { status: 500 });
  }
}
