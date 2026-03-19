"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useEvent } from "./use-events";

interface YnabAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  clearedBalance: number;
}

interface YnabCategory {
  name: string;
  group?: string;
  budgeted: number;
  activity: number;
  balance: number;
}

interface YnabTransaction {
  id: string;
  date: string;
  amount: number;
  payee: string;
  category: string;
  memo: string | null;
  approved: boolean;
  cleared: string;
  account_id?: string;
}

interface YnabMonthBudget {
  income: number;
  budgeted: number;
  activity: number;
  toBeBudgeted: number;
  categories: YnabCategory[];
}

interface YnabData {
  summary: {
    totalBalance: number;
    accounts: YnabAccount[];
    categories: YnabCategory[];
  };
  transactions: YnabTransaction[];
  monthBudget: YnabMonthBudget;
  syncedAt: string;
}

interface YnabContextValue {
  data: YnabData | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  savingRate: number;
  sync: () => Promise<void>;
}

const YnabContext = createContext<YnabContextValue>({
  data: null,
  loading: false,
  error: null,
  connected: false,
  savingRate: 0,
  sync: async () => {},
});

export function YnabProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<YnabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [savingRate, setSavingRate] = useState(0);

  const sync = useCallback(async () => {
    // Rate limit protection — don't sync more than once per 2 minutes
    const lastSync = typeof window !== "undefined" ? parseInt(localStorage.getItem("dough-last-sync") || "0", 10) : 0;
    if (Date.now() - lastSync < 120000) {
      console.warn("[ynab-context] Sync throttled, last sync was", Math.round((Date.now() - lastSync) / 1000), "seconds ago");
      setLoading(false);
      return;
    }

    console.info("[ynab-context] Starting sync");
    setLoading(true);
    setError(null);
    try {
      if (typeof window !== "undefined") localStorage.setItem("dough-last-sync", String(Date.now()));
      const res = await fetch("/api/ynab/sync", { method: "POST" });
      const json = await res.json();
      if (json.success && json.data) {
        console.info("[ynab-context] Sync complete, transactions:", json.data.transactions?.length);
        setData(json.data);
        setError(null);
      } else {
        const errMsg = json.error || "Sync failed";
        console.warn("[ynab-context] Sync failed:", errMsg);
        setError(errMsg.includes("429") || errMsg.includes("abnormal") ? "YNAB rate limit exceeded. Wait a few minutes and try again." : errMsg);
      }
    } catch (err) {
      console.error("[ynab-context] Sync error:", err);
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.debug("[ynab-context] Checking YNAB connection");
    fetch("/api/household")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.saving_rate) {
          setSavingRate(parseFloat(d.settings.saving_rate));
        }
        if (d.settings?.ynab_connected && d.settings?.ynab_budget_id) {
          setConnected(true);
          // Only sync if no cached data (first load). Subsequent syncs are manual.
          if (!data) {
            console.info("[ynab-context] YNAB connected, initial sync");
            sync();
          } else {
            setLoading(false);
          }
        } else {
          console.debug("[ynab-context] YNAB not connected or no budget ID");
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("[ynab-context] Failed to check connection:", err);
        setLoading(false);
      });
  }, [sync]);

  // SSE: don't auto re-sync on events (causes YNAB rate limiting)
  // Users should manually sync via the sync button

  return (
    <YnabContext.Provider value={{ data, loading, error, connected, savingRate, sync }}>
      {children}
    </YnabContext.Provider>
  );
}

export function useYnab() {
  return useContext(YnabContext);
}

export type { YnabTransaction, YnabAccount, YnabCategory, YnabMonthBudget, YnabData };
