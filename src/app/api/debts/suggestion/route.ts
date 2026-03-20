/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { spawn } from "child_process";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ suggestion: null }, { status: 401 });

    console.info("[debts/suggestion] Fetching data for AI suggestion");

    const db = getDb();

    // Check for cached suggestion (valid for 24 hours)
    const cachedSuggestion = db
      .prepare("SELECT content, created_at FROM ai_summaries WHERE user_id = ? AND locale = 'debt' ORDER BY created_at DESC LIMIT 1")
      .get(user.id) as { content: string; created_at: string } | undefined;
    if (cachedSuggestion) {
      const age = Date.now() - new Date(cachedSuggestion.created_at + "Z").getTime();
      if (age < 24 * 60 * 60 * 1000) {
        console.debug("[debts/suggestion] Returning cached suggestion, age:", Math.round(age / 60000), "min");
        return NextResponse.json({ suggestion: cachedSuggestion.content });
      }
    }

    const cached = db.prepare("SELECT data FROM ynab_cache WHERE id = 1").get() as { data: string } | undefined;
    if (!cached) return NextResponse.json({ suggestion: null });

    const ynabData = JSON.parse(cached.data);
    const debtAccounts = ynabData.summary.accounts.filter((a: any) => a.type === "otherDebt" && a.balance < 0);
    if (debtAccounts.length === 0) return NextResponse.json({ suggestion: null });

    // Load overrides for interest rates and payments
    const overrides = db.prepare("SELECT * FROM debt_overrides").all() as any[];
    const overrideMap: Record<string, any> = {};
    for (const o of overrides) overrideMap[o.ynab_account_id] = o;

    const debts = debtAccounts.map((a: any) => {
      const override = overrideMap[a.id];
      const balance = Math.abs(a.balance);
      const rate = override?.interest_rate ?? 0;
      const payment = override?.minimum_payment ?? 0;
      const dueDay = override?.due_day ?? 0;
      return `${a.name}: ${balance.toFixed(0)} euros${rate > 0 ? ` (${rate}% APR)` : ""}${payment > 0 ? `, ${payment} euros/month` : ""}${dueDay > 0 ? ` (due ${dueDay}th)` : ""}`;
    });

    const { getHouseholdSetting } = await import("@/lib/household");
    const householdProfile = getHouseholdSetting("household_profile") || "";
    const { DEFAULT_DEBT_INSTRUCTIONS } = await import("@/lib/ai/default-prompts");
    const debtInstructions = getHouseholdSetting("prompt_debt_instructions") || DEFAULT_DEBT_INSTRUCTIONS;

    const lang = user.locale === "fi" ? "Respond in Finnish." : "Respond in English.";
    const prompt = `${lang} You are a debt advisor.${householdProfile ? ` Household: ${householdProfile}.` : ""} ${debtInstructions}

Debts:
${debts.join("\n")}

Total debt: ${debtAccounts.reduce((s: number, a: any) => s + Math.abs(a.balance), 0).toFixed(0)} euros`;

    const claudePath = process.env.CLAUDE_PATH || "claude";

    const suggestion = await new Promise<string>((resolve, reject) => {
      const proc = spawn(claudePath, ["-p", "--model", "opus", "-"], {
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

    // Cache to DB
    db.prepare("INSERT INTO ai_summaries (user_id, locale, content) VALUES (?, 'debt', ?)")
      .run(user.id, suggestion);

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("[debts/suggestion] Error:", error);
    return NextResponse.json({ suggestion: null }, { status: 500 });
  }
}
