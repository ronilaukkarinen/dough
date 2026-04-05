import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ trends: [] }, { status: 401 });

    const db = getDb();
    const now = new Date();

    // Rolling 30-day windows from local transactions
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const todayStr = fmtDate(now);
    const thirtyStr = fmtDate(thirtyDaysAgo);
    const sixtyStr = fmtDate(sixtyDaysAgo);

    // Recent 30 days by category
    const recent = db.prepare(
      "SELECT category, SUM(ABS(amount)) as total FROM transactions WHERE date > ? AND date <= ? AND amount < 0 AND payee NOT LIKE 'Transfer%' AND payee NOT LIKE 'Starting Balance%' AND payee NOT LIKE 'Reconciliation%' AND category != 'Uncategorized' AND category != 'Inflow: Ready to Assign' GROUP BY category"
    ).all(thirtyStr, todayStr) as { category: string; total: number }[];

    // Previous 30 days by category
    const previous = db.prepare(
      "SELECT category, SUM(ABS(amount)) as total FROM transactions WHERE date > ? AND date <= ? AND amount < 0 AND payee NOT LIKE 'Transfer%' AND payee NOT LIKE 'Starting Balance%' AND payee NOT LIKE 'Reconciliation%' AND category != 'Uncategorized' AND category != 'Inflow: Ready to Assign' GROUP BY category"
    ).all(sixtyStr, thirtyStr) as { category: string; total: number }[];

    const recentMap = new Map(recent.map((r) => [r.category, r.total]));
    const prevMap = new Map(previous.map((r) => [r.category, r.total]));

    const allCategories = new Set([...recentMap.keys(), ...prevMap.keys()]);
    const trends = [...allCategories]
      .map((c) => ({
        category: c,
        thisMonth: Math.round((recentMap.get(c) || 0) * 100) / 100,
        lastMonth: Math.round((prevMap.get(c) || 0) * 100) / 100,
      }))
      .filter((t) => t.thisMonth > 0 || t.lastMonth > 0);

    console.debug("[trends] Loaded", trends.length, "category trends");
    return NextResponse.json({ trends });
  } catch (error) {
    console.error("[trends] Error:", error);
    return NextResponse.json({ trends: [] }, { status: 500 });
  }
}
