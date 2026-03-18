"use client";

import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownLeft, MoreHorizontal } from "lucide-react";
import Link from "next/link";

interface Transaction {
  id: string;
  date: string;
  payee: string;
  category: string;
  amount: number;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  currency?: string;
}

export function RecentTransactions({
  transactions,
  currency = "€",
}: RecentTransactionsProps) {
  return (
    <Card className="border-border/50 bg-card/80 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Recent Transactions
        </h3>
        <Link
          href="/transactions"
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all
        </Link>
      </div>
      <div className="mt-4 space-y-1">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/50"
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
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
              <p className="text-sm font-medium text-foreground truncate">
                {tx.payee}
              </p>
              <p className="text-xs text-muted-foreground">{tx.category}</p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-semibold ${
                  tx.amount < 0 ? "text-foreground" : "text-positive"
                }`}
              >
                {tx.amount < 0 ? "-" : "+"}
                {currency}
                {Math.abs(tx.amount).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">{tx.date}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
