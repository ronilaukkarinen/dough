"use client";

import { useLocale } from "@/lib/locale-context";
import { useYnab } from "@/lib/ynab-context";
import { DailyAllowance } from "@/components/dashboard/daily-allowance";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { CashFlowChart } from "@/components/dashboard/cash-flow";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { Loader2 } from "lucide-react";

// Chart colors for categories
const CATEGORY_COLORS = ["#4d94ff", "#00e676", "#ffb74d", "#b388ff", "#ff80ab", "#7a8ba0"];

export default function DashboardPage() {
  const { t } = useLocale();
  const { data, loading, connected } = useYnab();

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
  const totalBalance = data.summary.totalBalance;
  const monthActivity = Math.abs(data.monthBudget.activity);
  const monthIncome = data.monthBudget.income;

  // Available = what's left to spend this month (toBeBudgeted or remaining balance)
  const availableBalance = Math.round(data.monthBudget.toBeBudgeted * 100) / 100;
  const dailyBudget = daysLeft > 0 ? Math.round((availableBalance / daysLeft) * 100) / 100 : 0;

  // Build spending chart data from transactions
  const spendingByDay: Record<string, number> = {};
  const sortedTx = [...data.transactions]
    .filter((t) => t.amount < 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  let cumulative = 0;
  for (const tx of sortedTx) {
    const day = parseInt(tx.date.split("-")[2], 10);
    cumulative += Math.abs(tx.amount);
    spendingByDay[day] = Math.round(cumulative);
  }

  const dailyBudgetLine = availableBalance > 0 ? (monthActivity + availableBalance) / daysInMonth : monthActivity / now.getDate();
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
      income: Math.round(monthIncome),
      expenses: Math.round(monthActivity),
      net: Math.round(monthIncome - monthActivity),
    },
  ];

  return (
    <div className="page-stack">
      <div>
        <h1 className="page-heading">{t.dashboard.title}</h1>
      </div>

      <DailyAllowance
        dailyBudget={dailyBudget}
        availableBalance={Math.round(availableBalance)}
        upcomingBills={0}
        nextIncomeAmount={0}
        nextIncomeDate=""
        daysUntilIncome={daysLeft}
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
    </div>
  );
}
