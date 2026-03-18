"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [savingRate, setSavingRate] = useState(0);

  const sync = useCallback(async () => {
    console.info("[ynab-context] Starting sync");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ynab/sync", { method: "POST" });
      const json = await res.json();
      if (json.success && json.data) {
        console.info("[ynab-context] Sync complete, transactions:", json.data.transactions?.length);
        setData(json.data);
      } else {
        console.warn("[ynab-context] Sync failed:", json.error);
        setError(json.error || "Sync failed");
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
          console.info("[ynab-context] YNAB connected, auto-syncing");
          setConnected(true);
          sync();
        } else {
          console.debug("[ynab-context] YNAB not connected or no budget ID");
        }
      })
      .catch((err) => console.error("[ynab-context] Failed to check connection:", err));
  }, [sync]);

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
