"use client";

import { useLocale } from "@/lib/locale-context";
import { useYnab } from "@/lib/ynab-context";
import { DailyAllowance } from "@/components/dashboard/daily-allowance";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { CashFlowChart } from "@/components/dashboard/cash-flow";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { AiSummary } from "@/components/dashboard/ai-summary";
import { NetWorth } from "@/components/dashboard/net-worth";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fi as fiFns, enUS } from "date-fns/locale";

// Chart colors for categories
const CATEGORY_COLORS = ["#818cf8", "#4ade80", "#fbbf24", "#c084fc", "#f472b6", "#71717a"];

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const { data, loading, connected, sync, savingRate } = useYnab();

  if (!connected) {
    return (
      <div className="page-stack">
        <div>
          <h1 className="page-heading">{t.dashboard.title}</h1>
          <p className="page-subtitle">{t.settings.ynabDescription}</p>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="page-loading">
        <Loader2 className="page-loading-spinner animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  // Calculate daily budget from real data
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const monthActivity = Math.abs(data.monthBudget.activity);
  const toBeBudgeted = data.monthBudget.toBeBudgeted;

  // Real income = positive transactions excluding transfers
  const realIncome = data.transactions
    .filter((t) => t.amount > 0 && !t.payee.startsWith("Transfer"))
    .reduce((s, t) => s + t.amount, 0);

  // Available = total checking + savings accounts
  const availableBalance = Math.round(
    data.summary.accounts
      .filter((a) => a.type === "checking" || a.type === "savings")
      .reduce((s, a) => s + a.balance, 0) * 100
  ) / 100;

  // Daily budget from available balance minus saving goal
  const spendableBalance = Math.max(0, availableBalance - savingRate);
  const dailyBudget = daysLeft > 0 ? Math.round((spendableBalance / daysLeft) * 100) / 100 : 0;

  // Burn rate = average daily real spending this month
  const daysPassed = now.getDate();
  const realSpendingTotal = data.transactions
    .filter((t) => t.amount < 0 && !t.payee.startsWith("Transfer") && t.category !== "Uncategorized")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const dailyBurnRate = daysPassed > 0 ? Math.round((realSpendingTotal / daysPassed) * 100) / 100 : 0;
  const projectedMonthEnd = Math.round((availableBalance - (dailyBurnRate * daysLeft)) * 100) / 100;

  // Build spending chart data from transactions (exclude transfers)
  const spendingByDay: Record<string, number> = {};
  const sortedTx = [...data.transactions]
    .filter((t) => t.amount < 0 && !t.payee.startsWith("Transfer") && t.category !== "Uncategorized")
    .sort((a, b) => a.date.localeCompare(b.date));

  let cumulative = 0;
  for (const tx of sortedTx) {
    const day = parseInt(tx.date.split("-")[2], 10);
    cumulative += Math.abs(tx.amount);
    spendingByDay[day] = Math.round(cumulative);
  }

  // Budget line based on actual non-transfer spending
  const realSpending = sortedTx.reduce((s, t) => s + Math.abs(t.amount), 0);
  const dailyBudgetLine = now.getDate() > 0 ? realSpending / now.getDate() : 0;
  const spendingData = Array.from({ length: now.getDate() }, (_, i) => ({
    date: `${i + 1}.`,
    spent: spendingByDay[i + 1] || (i > 0 ? spendingByDay[i] || 0 : 0),
    budget: Math.round(dailyBudgetLine * (i + 1)),
  }));
  // Fill forward missing days
  for (let i = 1; i < spendingData.length; i++) {
    if (spendingData[i].spent === 0 && spendingData[i - 1].spent > 0) {
      spendingData[i].spent = spendingData[i - 1].spent;
    }
  }

  // Top categories by spending this month
  const categorySpending = data.monthBudget.categories
    .filter((c) => c.activity < 0 && c.name !== "Inflow: Ready to Assign")
    .sort((a, b) => a.activity - b.activity)
    .slice(0, 6)
    .map((c, i) => ({
      name: c.name,
      amount: Math.round(Math.abs(c.activity)),
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

  const totalCategorySpending = categorySpending.reduce((s, c) => s + c.amount, 0);

  // Recent transactions (last 7)
  const recentTransactions = [...data.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .map((tx) => ({
      id: tx.id,
      date: tx.date,
      payee: tx.payee,
      category: tx.category,
      amount: tx.amount,
    }));

  // Cash flow — we only have current month from the API, show summary
  const cashFlowData = [
    {
      month: new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en", { month: "short" }),
      income: Math.round(realIncome),
      expenses: Math.round(monthActivity),
      net: Math.round(realIncome - monthActivity),
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <h1 className="page-heading">{t.dashboard.title}</h1>
        <div className="sync-row">
          {data?.syncedAt && (
            <span className="sync-time">
              {formatDistanceToNow(new Date(data.syncedAt), { addSuffix: true, locale: locale === "fi" ? fiFns : enUS })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => sync()} disabled={loading}>
            <RefreshCw className={loading ? "icon-sm animate-spin" : "icon-sm"} />
          </Button>
        </div>
      </div>

      <AiSummary />

      <DailyAllowance
        dailyBudget={dailyBudget}
        availableBalance={Math.round(availableBalance)}
        upcomingBills={0}
        nextIncomeAmount={0}
        nextIncomeDate=""
        daysUntilIncome={daysLeft}
        burnRate={dailyBurnRate}
        projectedMonthEnd={projectedMonthEnd}
      />

      <div className="page-grid-2">
        <SpendingChart data={spendingData} />
        <CategoryBreakdown
          categories={categorySpending}
          total={totalCategorySpending}
        />
      </div>

      <div className="page-grid-2">
        <CashFlowChart data={cashFlowData} />
        <RecentTransactions transactions={recentTransactions} />
      </div>

      <NetWorth accounts={data.summary.accounts} />
    </div>
  );
}
