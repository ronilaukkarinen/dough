"use client";

import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp, CalendarClock, Wallet } from "lucide-react";

interface DailyAllowanceProps {
  dailyBudget: number;
  availableBalance: number;
  upcomingBills: number;
  nextIncomeAmount: number;
  nextIncomeDate: string;
  daysUntilIncome: number;
  currency?: string;
}

export function DailyAllowance({
  dailyBudget,
  availableBalance,
  upcomingBills,
  nextIncomeAmount,
  nextIncomeDate,
  daysUntilIncome,
  currency = "€",
}: DailyAllowanceProps) {
  const status =
    dailyBudget > 50 ? "good" : dailyBudget > 20 ? "tight" : "danger";

  const statusColor = {
    good: "text-positive",
    tight: "text-chart-3",
    danger: "text-negative",
  }[status];

  const statusBg = {
    good: "from-positive/10 to-positive/5",
    tight: "from-chart-3/10 to-chart-3/5",
    danger: "from-negative/10 to-negative/5",
  }[status];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Daily Budget - Hero card */}
      <Card
        className={`relative col-span-full overflow-hidden border-0 bg-gradient-to-br ${statusBg} p-8 md:col-span-2`}
      >
        <div className="relative z-10">
          <p className="text-sm font-medium text-muted-foreground">
            Daily Budget
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-5xl font-bold tracking-tight ${statusColor}`}>
              {currency}
              {dailyBudget.toFixed(0)}
            </span>
            <span className="text-lg text-muted-foreground">/ day</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {daysUntilIncome} days until next income
            {status === "danger" && " — cut non-essentials"}
            {status === "tight" && " — be careful"}
          </p>
        </div>
        <div className="absolute -bottom-4 -right-4 opacity-5">
          <Wallet className="h-32 w-32" />
        </div>
      </Card>

      {/* Available Balance */}
      <Card className="border-border/50 bg-card/80 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Available
            </p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {currency}
              {availableBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      {/* Upcoming Bills */}
      <Card className="border-border/50 bg-card/80 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-negative/10">
            <ArrowUp className="h-5 w-5 text-negative" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Bills due
            </p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {currency}
              {upcomingBills.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      {/* Smaller info cards */}
      <Card className="border-border/50 bg-card/80 p-6 md:col-span-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-positive/10">
            <ArrowDown className="h-5 w-5 text-positive" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Next income
            </p>
            <p className="text-xl font-bold tracking-tight text-foreground">
              {currency}
              {nextIncomeAmount.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{nextIncomeDate}</p>
          </div>
        </div>
      </Card>

      <Card className="border-border/50 bg-card/80 p-6 md:col-span-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
            <CalendarClock className="h-5 w-5 text-chart-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Cash flow forecast
            </p>
            <p className="text-xl font-bold tracking-tight text-foreground">
              {currency}
              {(availableBalance - upcomingBills + nextIncomeAmount).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">End of month estimate</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
