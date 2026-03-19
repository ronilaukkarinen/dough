/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = getDb();
    const snapshots = db
      .prepare("SELECT date, checking, savings, investments, debts, net_worth FROM net_worth_snapshots ORDER BY date ASC")
      .all() as any[];

    console.debug("[net-worth] Loaded", snapshots.length, "snapshots for user", user.id);

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error("[net-worth] GET error:", error);
    return NextResponse.json({ snapshots: [] }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = getDb();
    const row = db
      .prepare("SELECT ynab_access_token, ynab_budget_id FROM users WHERE id = ?")
      .get(user.id) as { ynab_access_token: string | null; ynab_budget_id: string | null } | undefined;

    if (!row?.ynab_access_token || !row?.ynab_budget_id) {
      return NextResponse.json({ error: "YNAB not connected" }, { status: 400 });
    }

    console.info("[net-worth] Taking snapshot for user", user.id);

    const { getBudgetSummary } = await import("@/lib/ynab/client");
    const summary = await getBudgetSummary(row.ynab_budget_id, row.ynab_access_token);

    const checking = summary.accounts
      .filter((a: any) => a.type === "checking")
      .reduce((s: number, a: any) => s + a.balance, 0);

    const savings = summary.accounts
      .filter((a: any) => a.type === "savings")
      .reduce((s: number, a: any) => s + a.balance, 0);

    const investments = summary.accounts
      .filter((a: any) => a.type === "otherAsset")
      .reduce((s: number, a: any) => s + a.balance, 0);

    const debtTotal = summary.accounts
      .filter((a: any) => a.type === "otherDebt")
      .reduce((s: number, a: any) => s + a.balance, 0);

    const netWorth = checking + savings + investments + debtTotal;
    const today = new Date().toISOString().slice(0, 10);

    db.prepare(`
      INSERT INTO net_worth_snapshots (user_id, date, checking, savings, investments, debts, net_worth)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        checking = excluded.checking,
        savings = excluded.savings,
        investments = excluded.investments,
        debts = excluded.debts,
        net_worth = excluded.net_worth
    `).run(user.id, today, checking, savings, investments, debtTotal, netWorth);

    console.info("[net-worth] Snapshot saved:", { checking, savings, investments, debts: debtTotal, netWorth });

    return NextResponse.json({ success: true, snapshot: { date: today, checking, savings, investments, debts: debtTotal, net_worth: netWorth } });
  } catch (error) {
    console.error("[net-worth] POST error:", error);
    return NextResponse.json({ error: "Failed to take snapshot" }, { status: 500 });
  }
}
