/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ investments: [] }, { status: 401 });

    const db = getDb();

    // Get YNAB investment accounts from SQLite
    const investmentAccounts = db.prepare("SELECT id, name, balance FROM ynab_accounts WHERE type = 'otherAsset' AND closed = 0 ORDER BY name").all() as { id: string; name: string; balance: number }[];

    if (investmentAccounts.length === 0) {
      return NextResponse.json({ investments: [], error: "No investment accounts. Sync first." });
    }

    // Get transactions for monthly transfer detection
    const now2 = new Date();
    const monthStr2 = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, "0")}`;
    const transactions = db.prepare("SELECT amount, account_id, date FROM transactions WHERE user_id = ? AND date >= ?").all(user.id, monthStr2 + "-01") as { amount: number; account_id: string; date: string }[];

    // Load overrides from DB
    const overrides = db.prepare("SELECT * FROM investment_overrides").all() as any[];
    const overrideMap: Record<string, any> = {};
    for (const o of overrides) {
      overrideMap[o.ynab_account_id] = o;
    }

    // Find monthly transfers to each investment account
    const investments = investmentAccounts.map((a: any) => {
      const override = overrideMap[a.id];

      // Find transfer transactions TO this account this month
      const transfersIn = transactions.filter((t: any) =>
        t.amount > 0 &&
        t.account_id === a.id
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
        ticker: override?.ticker ?? "",
        sortOrder: override?.sort_order ?? 999,
      };
    });

    investments.sort((a: any, b: any) => a.sortOrder - b.sortOrder);
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
    const { ynab_account_id, monthly_contribution, expected_return, notes, ticker } = body;

    if (!ynab_account_id) return NextResponse.json({ error: "Account ID required" }, { status: 400 });

    const db = getDb();
    db.prepare(`
      INSERT INTO investment_overrides (ynab_account_id, monthly_contribution, expected_return, notes, ticker)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(ynab_account_id) DO UPDATE SET
        monthly_contribution = excluded.monthly_contribution,
        expected_return = excluded.expected_return,
        notes = excluded.notes,
        ticker = excluded.ticker,
        updated_at = datetime('now')
    `).run(ynab_account_id, monthly_contribution ?? 0, expected_return ?? 7, notes ?? "", ticker ?? "");

    console.info("[investments] Override saved for", ynab_account_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[investments] PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const { order } = body;
    if (!Array.isArray(order)) return NextResponse.json({ error: "order array required" }, { status: 400 });

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO investment_overrides (ynab_account_id, sort_order) VALUES (?, ?)
      ON CONFLICT(ynab_account_id) DO UPDATE SET sort_order = excluded.sort_order, updated_at = datetime('now')
    `);
    const batch = db.transaction(() => {
      for (let i = 0; i < order.length; i++) {
        stmt.run(order[i], i);
      }
    });
    batch();

    console.info("[investments] Saved order for", order.length, "investments");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[investments] PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
