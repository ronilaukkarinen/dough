"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Transactions
          </h1>
          <p className="text-sm text-muted-foreground">
            Synced from YNAB
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Sync
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 bg-background/50 border-border/50"
          />
        </div>
        <div className="flex gap-2">
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
      <Card className="border-border/50 bg-card/80 divide-y divide-border/50">
        {filtered.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/30"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                tx.amount < 0 ? "bg-negative/10" : "bg-positive/10"
              }`}
            >
              {tx.amount < 0 ? (
                <ArrowUpRight className="h-4 w-4 text-negative" />
              ) : (
                <ArrowDownLeft className="h-4 w-4 text-positive" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {tx.payee}
                </p>
                {tx.isRecurring && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Recurring
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{tx.category}</p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-semibold tabular-nums ${
                  tx.amount < 0 ? "text-foreground" : "text-positive"
                }`}
              >
                {tx.amount < 0 ? "- " : "+ "}{Math.abs(tx.amount).toFixed(2)} €
              </p>
              <p className="text-[10px] text-muted-foreground">{tx.date}</p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
