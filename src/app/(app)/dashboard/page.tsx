"use client";

import { useLocale } from "@/lib/locale-context";
import { DailyAllowance } from "@/components/dashboard/daily-allowance";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { CashFlowChart } from "@/components/dashboard/cash-flow";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";

// Demo data — will be replaced with YNAB data
const spendingData = Array.from({ length: 18 }, (_, i) => ({
  date: `Mar ${i + 1}`,
  spent: Math.round(50 + Math.random() * 80) * (i + 1) * 0.6,
  budget: 55 * (i + 1),
}));

const categories = [
  { name: "Groceries", amount: 487, color: "#4d94ff" },
  { name: "Restaurants", amount: 156, color: "#00e676" },
  { name: "Transport", amount: 89, color: "#ffb74d" },
  { name: "Subscriptions", amount: 187, color: "#b388ff" },
  { name: "Shopping", amount: 134, color: "#ff80ab" },
  { name: "Other", amount: 97, color: "#7a8ba0" },
];

const cashFlowData = [
  { month: "Oct", income: 4200, expenses: 3800, net: 400 },
  { month: "Nov", income: 4200, expenses: 4100, net: 100 },
  { month: "Dec", income: 4800, expenses: 5200, net: -400 },
  { month: "Jan", income: 4200, expenses: 4400, net: -200 },
  { month: "Feb", income: 4200, expenses: 3900, net: 300 },
  { month: "Mar", income: 2100, expenses: 1750, net: 350 },
];

const recentTransactions = [
  { id: "1", date: "Mar 18", payee: "S-Market", category: "Groceries", amount: -47.80 },
  { id: "2", date: "Mar 17", payee: "ABC-asema", category: "Transport", amount: -52.10 },
  { id: "3", date: "Mar 17", payee: "Netflix", category: "Subscriptions", amount: -17.99 },
  { id: "4", date: "Mar 16", payee: "Ravintola Savotta", category: "Restaurants", amount: -38.50 },
  { id: "5", date: "Mar 15", payee: "Salary", category: "Income", amount: 2100 },
  { id: "6", date: "Mar 15", payee: "Prisma", category: "Groceries", amount: -63.20 },
  { id: "7", date: "Mar 14", payee: "Spotify", category: "Subscriptions", amount: -10.99 },
];

export default function DashboardPage() {
  const { t } = useLocale();
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t.dashboard.title}
        </h1>
      </div>

      {/* Daily allowance + key metrics */}
      <DailyAllowance
        dailyBudget={32}
        availableBalance={400}
        upcomingBills={500}
        nextIncomeAmount={1200}
        nextIncomeDate="March 25"
        daysUntilIncome={7}
      />

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SpendingChart data={spendingData} />
        <CategoryBreakdown
          categories={categories}
          total={categories.reduce((s, c) => s + c.amount, 0)}
        />
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CashFlowChart data={cashFlowData} />
        <RecentTransactions transactions={recentTransactions} />
      </div>
    </div>
  );
}
