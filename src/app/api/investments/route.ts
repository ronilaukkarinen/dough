/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ investments: [] }, { status: 401 });

    const db = getDb();

    // Get YNAB investment accounts from cache
    const cached = db.prepare("SELECT data FROM ynab_cache WHERE id = 1").get() as { data: string } | undefined;
    if (!cached) {
      return NextResponse.json({ investments: [], error: "No cached data. Sync first." });
    }

    const ynabData = JSON.parse(cached.data);
    const { summary, transactions } = ynabData;

    // Investment accounts in YNAB are type "otherAsset"
    const investmentAccounts = summary.accounts.filter((a: any) => a.type === "otherAsset");

    // Load overrides from DB
    const overrides = db.prepare("SELECT * FROM investment_overrides").all() as any[];
    const overrideMap: Record<string, any> = {};
    for (const o of overrides) {
      overrideMap[o.ynab_account_id] = o;
    }

    // Find monthly transfers to each investment account
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const investments = investmentAccounts.map((a: any) => {
      const override = overrideMap[a.id];

      // Find transfer transactions TO this account this month
      const transfersIn = transactions.filter((t: any) =>
        t.amount > 0 &&
        t.account_id === a.id &&
        t.date.startsWith(monthStr)
      );
      const monthlyTransferred = transfersIn.reduce((s: number, t: any) => s + t.amount, 0);

      return {
        id: a.id,
        name: a.name,
        balance: a.balance,
        monthlyContribution: override?.monthly_contribution ?? 0,
        expectedReturn: override?.expected_return ?? 7,
        monthlyTransferred: Math.round(monthlyTransferred * 100) / 100,
        notes: override?.notes ?? "",
      };
    });

    console.info("[investments] Loaded", investments.length, "investment accounts from YNAB cache");
    return NextResponse.json({
      investments,
      totalValue: investments.reduce((s: number, i: any) => s + i.balance, 0),
      totalMonthly: investments.reduce((s: number, i: any) => s + i.monthlyContribution, 0),
    });
  } catch (error) {
    console.error("[investments] GET error:", error);
    return NextResponse.json({ investments: [], error: "Failed to load investments" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const { ynab_account_id, monthly_contribution, expected_return, notes } = body;

    if (!ynab_account_id) return NextResponse.json({ error: "Account ID required" }, { status: 400 });

    const db = getDb();
    db.prepare(`
      INSERT INTO investment_overrides (ynab_account_id, monthly_contribution, expected_return, notes)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(ynab_account_id) DO UPDATE SET
        monthly_contribution = excluded.monthly_contribution,
        expected_return = excluded.expected_return,
        notes = excluded.notes,
        updated_at = datetime('now')
    `).run(ynab_account_id, monthly_contribution ?? 0, expected_return ?? 7, notes ?? "");

    console.info("[investments] Override saved for", ynab_account_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[investments] PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
