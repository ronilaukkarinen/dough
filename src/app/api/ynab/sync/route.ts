import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getYnabToken, getYnabBudgetId, setHouseholdSetting } from "@/lib/household";
import { eventBus } from "@/lib/event-bus";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });

    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const cached = db.prepare("SELECT data, synced_at FROM ynab_cache WHERE id = 1").get() as { data: string; synced_at: string } | undefined;

    if (!cached) {
      console.debug("[api/ynab/sync] No cached data");
      return NextResponse.json({ success: false, error: "No cached data. Sync first." });
    }

    const data = JSON.parse(cached.data);
    console.debug("[api/ynab/sync] Serving cached data from", cached.synced_at);
    return NextResponse.json({ success: true, data, cached: true });
  } catch (error) {
    console.error("[api/ynab/sync] Cache GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to read cache" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await getSession();
    if (!user) {
      console.warn("[api/ynab/sync] Unauthorized sync attempt");
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    console.info("[api/ynab/sync] Starting sync for user", user.id);

    const token = getYnabToken();
    const budgetId = getYnabBudgetId();

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

    // Update last sync time in household settings
    setHouseholdSetting("last_ynab_sync", new Date().toISOString());

    // Auto-take net worth snapshot
    try {
      const { getDb } = await import("@/lib/db");
      const db = getDb();
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const checking = summary.accounts.filter((a: any) => a.type === "checking").reduce((s: number, a: any) => s + a.balance, 0);
      const savings = summary.accounts.filter((a: any) => a.type === "savings").reduce((s: number, a: any) => s + a.balance, 0);
      const investments = summary.accounts.filter((a: any) => a.type === "otherAsset").reduce((s: number, a: any) => s + a.balance, 0);
      const debtTotal = summary.accounts.filter((a: any) => a.type === "otherDebt").reduce((s: number, a: any) => s + a.balance, 0);
      const netWorth = checking + savings + investments + debtTotal;
      const today = new Date().toISOString().slice(0, 10);

      db.prepare(`
        INSERT INTO net_worth_snapshots (user_id, date, checking, savings, investments, debts, net_worth)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, date) DO UPDATE SET checking=excluded.checking, savings=excluded.savings, investments=excluded.investments, debts=excluded.debts, net_worth=excluded.net_worth
      `).run(user.id, today, checking, savings, investments, debtTotal, netWorth);
      console.info("[api/ynab/sync] Net worth snapshot auto-saved");
    } catch (err) {
      console.error("[api/ynab/sync] Failed to save net worth snapshot:", err);
    }

    // Auto-match transactions to income sources and bills
    try {
      const { runAutoMatch } = await import("@/lib/matching");
      const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const matchResult = runAutoMatch(transactions, month);
      console.info("[api/ynab/sync] Auto-match:", matchResult.matched, "new matches");
    } catch (err) {
      console.error("[api/ynab/sync] Auto-match error:", err);
    }

    const syncedAt = new Date().toISOString();
    const responseData = { summary, transactions, monthBudget, syncedAt };

    // Cache to SQLite for local-first operation
    try {
      const { getDb: getCacheDb } = await import("@/lib/db");
      const cacheDb = getCacheDb();
      cacheDb.prepare(`
        INSERT INTO ynab_cache (id, data, synced_at) VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET data = excluded.data, synced_at = excluded.synced_at
      `).run(JSON.stringify(responseData), syncedAt);
      console.info("[api/ynab/sync] Cached sync data to SQLite");
    } catch (err) {
      console.error("[api/ynab/sync] Failed to cache:", err);
    }

    console.info("[api/ynab/sync] Sync complete. Accounts:", summary.accounts.length, "Transactions:", transactions.length);

    eventBus.emit("sync:complete", { syncedAt });
    eventBus.emit("data:updated", { source: "ynab-sync" });

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    console.error("[api/ynab/sync] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to sync with YNAB";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
