"use client";

import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { relativeDate } from "@/lib/date-utils";
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

export function RecentTransactions({ transactions, currency = "€" }: RecentTransactionsProps) {
  const { t, locale, fmt, decimals } = useLocale();

  return (
    <Card className="recent-transactions-card">
      <div className="recent-transactions-header">
        <h3 className="recent-transactions-title">{t.dashboard.recentTransactions}</h3>
        <Link href="/transactions" className="recent-transactions-link">{t.common.viewAll}</Link>
      </div>
      <div className="recent-transactions-list">
        {transactions.map((tx) => (
          <div key={tx.id} className="recent-transactions-item">
            <div className="recent-transactions-icon" data-type={tx.amount < 0 ? "expense" : "income"}>
              {tx.amount < 0 ? <ArrowUpRight /> : <ArrowDownLeft />}
            </div>
            <div className="recent-transactions-info">
              <p className="recent-transactions-payee">{tx.payee}</p>
              <p className="recent-transactions-category">{tx.category}</p>
            </div>
            <div className="recent-transactions-amount">
              <p className={`recent-transactions-amount-value ${decimals < 2 ? "amt-tip" : ""}`} data-type={tx.amount < 0 ? "expense" : "income"} data-exact={decimals < 2 ? `${tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)} ${currency}` : undefined}>
                {tx.amount < 0 ? "-" : "+"}{fmt(Math.abs(tx.amount))} {currency}
              </p>
              <p className="recent-transactions-date">{relativeDate(tx.date, locale)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
