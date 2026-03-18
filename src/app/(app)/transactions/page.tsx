"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { isTransfer } from "@/lib/transaction-utils";
import { useYnab } from "@/lib/ynab-context";
import { relativeDate } from "@/lib/date-utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  RefreshCw,
  Loader2,
} from "lucide-react";

type FilterType = "all" | "income" | "expenses" | "transfers";

export default function TransactionsPage() {
  const { t, locale } = useLocale();
  const { data, loading, connected, sync } = useYnab();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filterLabels: Record<FilterType, string> = {
    all: t.transactions.all,
    expenses: t.transactions.expenses,
    income: t.transactions.income,
    transfers: locale === "fi" ? "Siirrot" : "Transfers",
  };

  const transactions = data?.transactions ?? [];

  const filtered = transactions
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((tx) => {
      if (search && !tx.payee.toLowerCase().includes(search.toLowerCase()) && !tx.category.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      const txIsTransfer = isTransfer(tx.payee, tx.category);
      if (filter === "income" && (tx.amount < 0 || txIsTransfer)) return false;
      if (filter === "expenses" && (tx.amount >= 0 || txIsTransfer)) return false;
      if (filter === "transfers" && !txIsTransfer) return false;
      if (filter === "all" && txIsTransfer) return false;
      return true;
    });

  if (!connected) {
    return (
      <div className="page-stack">
        <div>
          <h1 className="page-heading">{t.transactions.title}</h1>
          <p className="page-subtitle">{t.settings.ynabDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">{t.transactions.title}</h1>
          <p className="page-subtitle">{t.transactions.subtitle}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => sync()} disabled={loading}>
          <RefreshCw className={loading ? "icon-sm animate-spin" : "icon-sm"} />
          {t.common.sync}
        </Button>
      </div>

      <div className="filter-bar">
        <div className="filter-bar-search">
          <Search className="filter-bar-search-icon" />
          <Input
            placeholder={t.transactions.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-with-icon"
          />
        </div>
        <div className="filter-bar-buttons">
          {(["all", "expenses", "income", "transfers"] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {filterLabels[f]}
            </Button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="page-loading">
          <Loader2 className="page-loading-spinner animate-spin" />
        </div>
      ) : (
        <Card className="list-card list-card-divider">
          {filtered.map((tx) => {
            const txIsTransfer = isTransfer(tx.payee, tx.category);
            return (
            <div key={tx.id} className="list-item">
              <div className="list-item-icon" data-color={txIsTransfer ? "chart-3" : tx.amount < 0 ? "negative" : "positive"}>
                {tx.amount < 0 ? <ArrowUpRight className="icon-sm" /> : <ArrowDownLeft className="icon-sm" />}
              </div>
              <div className="list-item-body">
                <div className="list-item-name-row">
                  <p className="list-item-name">{tx.payee}</p>
                  {txIsTransfer && <Badge variant="secondary">{locale === "fi" ? "Siirto" : "Transfer"}</Badge>}
                </div>
                <p className="list-item-meta">{tx.category}</p>
              </div>
              <div className="list-item-amount">
                <p className="list-item-amount-value" data-positive={tx.amount >= 0 || undefined}>
                  {tx.amount < 0 ? "-" : "+"}{Math.abs(tx.amount).toFixed(2)} €
                </p>
                <p className="list-item-amount-date">{relativeDate(tx.date, locale)}</p>
              </div>
            </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="list-item">
              <p className="list-item-meta">{t.transactions.search}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
