"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  RefreshCw,
} from "lucide-react";

// Demo data
const demoTransactions = [
  { id: "1", date: "2026-03-18", payee: "S-Market Keljo", category: "Groceries", amount: -47.80, isRecurring: false },
  { id: "2", date: "2026-03-17", payee: "ABC Palokka", category: "Transport", amount: -52.10, isRecurring: false },
  { id: "3", date: "2026-03-17", payee: "Netflix", category: "Subscriptions", amount: -17.99, isRecurring: true },
  { id: "4", date: "2026-03-16", payee: "Ravintola Savotta", category: "Restaurants", amount: -38.50, isRecurring: false },
  { id: "5", date: "2026-03-15", payee: "Dude Oy — Salary", category: "Income", amount: 2100, isRecurring: true },
  { id: "6", date: "2026-03-15", payee: "Prisma Seppälä", category: "Groceries", amount: -63.20, isRecurring: false },
  { id: "7", date: "2026-03-14", payee: "Spotify", category: "Subscriptions", amount: -10.99, isRecurring: true },
  { id: "8", date: "2026-03-14", payee: "K-Market", category: "Groceries", amount: -22.45, isRecurring: false },
  { id: "9", date: "2026-03-13", payee: "Alko", category: "Entertainment", amount: -34.90, isRecurring: false },
  { id: "10", date: "2026-03-12", payee: "Helen Energia", category: "Utilities", amount: -89.00, isRecurring: true },
  { id: "11", date: "2026-03-11", payee: "Lidl", category: "Groceries", amount: -31.65, isRecurring: false },
  { id: "12", date: "2026-03-10", payee: "Freelance Invoice", category: "Income", amount: 850, isRecurring: false },
];

type FilterType = "all" | "recurring" | "income" | "expenses";

export default function TransactionsPage() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = demoTransactions.filter((tx) => {
    if (search && !tx.payee.toLowerCase().includes(search.toLowerCase()) && !tx.category.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filter === "recurring" && !tx.isRecurring) return false;
    if (filter === "income" && tx.amount < 0) return false;
    if (filter === "expenses" && tx.amount >= 0) return false;
    return true;
  });

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">{t.transactions.title}</h1>
          <p className="page-subtitle">Synced from YNAB</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="icon-sm" />
          Sync
        </Button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-bar-search">
          <Search className="filter-bar-search-icon" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-with-icon"
          />
        </div>
        <div className="filter-bar-buttons">
          {(["all", "expenses", "income", "recurring"] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <Card className="list-card list-card-divider">
        {filtered.map((tx) => (
          <div key={tx.id} className="list-item">
            <div
              className="list-item-icon"
              data-color={tx.amount < 0 ? "negative" : "positive"}
            >
              {tx.amount < 0 ? (
                <ArrowUpRight className="icon-sm" />
              ) : (
                <ArrowDownLeft className="icon-sm" />
              )}
            </div>
            <div className="list-item-body">
              <div className="list-item-name-row">
                <p className="list-item-name">{tx.payee}</p>
                {tx.isRecurring && (
                  <Badge variant="secondary">Recurring</Badge>
                )}
              </div>
              <p className="list-item-meta">{tx.category}</p>
            </div>
            <div className="list-item-amount">
              <p
                className="list-item-amount-value"
                data-positive={tx.amount >= 0 || undefined}
              >
                {tx.amount < 0 ? "- " : "+ "}{Math.abs(tx.amount).toFixed(2)} €
              </p>
              <p className="list-item-amount-date">{tx.date}</p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
