import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST() {
  try {
    const user = await getSession();
    if (!user) {
      console.warn("[api/ynab/sync] Unauthorized sync attempt");
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    console.info("[api/ynab/sync] Starting sync for user", user.id);

    const db = getDb();
    const row = db
      .prepare("SELECT ynab_access_token, ynab_budget_id FROM users WHERE id = ?")
      .get(user.id) as { ynab_access_token: string | null; ynab_budget_id: string | null } | undefined;

    const token = row?.ynab_access_token || process.env.YNAB_ACCESS_TOKEN;
    const budgetId = row?.ynab_budget_id || process.env.YNAB_BUDGET_ID;

    if (!token) {
      console.warn("[api/ynab/sync] No YNAB token for user", user.id);
      return NextResponse.json({ success: false, error: "YNAB token not configured" }, { status: 400 });
    }

    if (!budgetId) {
      console.warn("[api/ynab/sync] No YNAB budget ID for user", user.id);
      return NextResponse.json({ success: false, error: "YNAB budget ID not configured. Add it in settings." }, { status: 400 });
    }

    // Import dynamically to avoid issues when ynab isn't configured
    const { getBudgetSummary, getTransactions, getMonthBudget } = await import("@/lib/ynab/client");

    const now = new Date();
    const sinceDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    console.info("[api/ynab/sync] Fetching YNAB data since", sinceDate);

    const [summary, transactions, monthBudget] = await Promise.all([
      getBudgetSummary(budgetId, token),
      getTransactions(budgetId, sinceDate, token),
      getMonthBudget(budgetId, undefined, token),
    ]);

    // Update last sync time
    db.prepare("UPDATE users SET last_ynab_sync = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(user.id);

    console.info("[api/ynab/sync] Sync complete. Accounts:", summary.accounts.length, "Transactions:", transactions.length);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        transactions,
        monthBudget,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[api/ynab/sync] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to sync with YNAB";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
