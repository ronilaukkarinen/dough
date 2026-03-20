"use client";

import { useState, useEffect, useCallback } from "react";
import { useEvent } from "@/lib/use-events";
import { useLocale } from "@/lib/locale-context";
import { isTransfer } from "@/lib/transaction-utils";
import { useYnab } from "@/lib/ynab-context";
import { DailyAllowance } from "@/components/dashboard/daily-allowance";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { CashFlowChart } from "@/components/dashboard/cash-flow";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { AiSummary } from "@/components/dashboard/ai-summary";
import { NetWorth } from "@/components/dashboard/net-worth";
import { EntryReminder } from "@/components/dashboard/entry-reminder";
import { PersonalGreeting } from "@/components/dashboard/personal-greeting";
import { SpendingFlow } from "@/components/dashboard/spending-flow";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fi as fiFns, enUS } from "date-fns/locale";

// Chart colors for categories
const CATEGORY_COLORS = ["#818cf8", "#4ade80", "#fbbf24", "#c084fc", "#f472b6", "#71717a"];

interface IncomeSource {
  id: number;
  name: string;
  amount: number;
  expected_day: number;
  is_recurring: number;
  is_active: number;
}

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const { data, loading, connected, error: ynabError, sync, savingRate } = useYnab();
  const [incomes, setIncomes] = useState<IncomeSource[]>([]);
  const [matchedIncomeIds, setMatchedIncomeIds] = useState<Set<number>>(new Set());
  const [matchedBillIds, setMatchedBillIds] = useState<Set<number>>(new Set());
  const [bills, setBills] = useState<{ id: number; amount: number; due_day: number; is_active: number; is_paid: boolean }[]>([]);
  const [investmentMonthly, setInvestmentMonthly] = useState(0);
  const [debtMonthly, setDebtMonthly] = useState(0);
  const [debtItems, setDebtItems] = useState<{ amount: number; dueDay: number }[]>([]);
  const [linkedAccountIds, setLinkedAccountIds] = useState<string[]>([]);
  const [householdSize, setHouseholdSize] = useState(1);
  const [personalBudgetShare, setPersonalBudgetShare] = useState(0);
  const [monthlyHistory, setMonthlyHistory] = useState<{ month: string; income: number; expenses: number }[]>([]);
  const [lastYnabSync, setLastYnabSync] = useState<string | null>(null);

  const loadSideData = useCallback(() => {
    Promise.all([
      fetch("/api/income").then((r) => r.json()),
      fetch("/api/matches").then((r) => r.json()),
      fetch("/api/bills").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/household").then((r) => r.json()),
      fetch("/api/investments").then((r) => r.json()),
      fetch("/api/debts").then((r) => r.json()),
      fetch("/api/monthly-history").then((r) => r.json()),
    ]).then(([incomeData, matchData, billsData, profileData, householdData, investmentData, debtData, historyData]) => {
      if (profileData.linkedAccountIds) setLinkedAccountIds(profileData.linkedAccountIds);
      if (profileData.profile?.budget_share) setPersonalBudgetShare(profileData.profile.budget_share);
      if (householdData.settings?.last_ynab_sync) setLastYnabSync(householdData.settings.last_ynab_sync);
      if (householdData.settings?.household_size) setHouseholdSize(parseInt(householdData.settings.household_size, 10) || 1);
      if (incomeData.incomes) setIncomes(incomeData.incomes);
      if (billsData.bills) setBills(billsData.bills);
      if (investmentData.investments) {
        const totalMonthly = investmentData.investments
          .reduce((s: number, i: { monthlyContribution: number }) => s + i.monthlyContribution, 0);
        setInvestmentMonthly(totalMonthly);
      }
      if (debtData.debts) {
        const totalDebtPayments = debtData.debts
          .reduce((s: number, d: { minimumPayment: number; monthlyTarget: number }) => s + (d.minimumPayment || d.monthlyTarget || 0), 0);
        setDebtMonthly(totalDebtPayments);
        setDebtItems(debtData.debts.map((d: { minimumPayment: number; monthlyTarget: number; dueDay: number }) => ({
          amount: d.minimumPayment || d.monthlyTarget || 0,
          dueDay: d.dueDay || 0,
        })));
      }
      if (matchData.monthlyMatches) {
        const incIds = new Set<number>();
        const billIds = new Set<number>();
        for (const m of matchData.monthlyMatches) {
          if (m.source_type === "income") incIds.add(m.source_id);
          if (m.source_type === "bill") billIds.add(m.source_id);
        }
        setMatchedIncomeIds(incIds);
        setMatchedBillIds(billIds);
      }
      if (historyData.snapshots) setMonthlyHistory(historyData.snapshots);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadSideData(); }, [loadSideData]);

  // SSE: re-fetch income/bills when data changes
  useEvent("data:updated", useCallback(() => { loadSideData(); }, [loadSideData]));

  if (loading && !data) {
    return (
      <div className="page-loading">
        <Loader2 className="page-loading-spinner animate-spin" />
      </div>
    );
  }

  if (ynabError && !data) {
    return (
      <div className="page-stack">
        <div>
          <h1 className="page-heading">{t.dashboard.title}</h1>
          <div className="error-banner">
            <p className="error-banner-text">{ynabError}</p>
            <Button variant="outline" size="sm" onClick={() => sync()} disabled={loading}>
              <RefreshCw className={loading ? "icon-sm animate-spin" : "icon-sm"} />
              {locale === "fi" ? "Yritä uudelleen" : "Retry"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!connected && !data) {
    return (
      <div className="page-stack">
        <div>
          <h1 className="page-heading">{t.dashboard.title}</h1>
          <p className="page-subtitle">{t.settings.ynabDescription}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Calculate daily budget from real data
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();
  const monthActivity = Math.abs(data.monthBudget.activity);
  const toBeBudgeted = data.monthBudget.toBeBudgeted;

  // Real income = positive transactions excluding transfers
  const realIncome = data.transactions
    .filter((t) => t.amount > 0 && !isTransfer(t.payee, t.category))
    .reduce((s, t) => s + t.amount, 0);

  // Available = total checking + savings accounts
  const availableBalance = Math.round(
    data.summary.accounts
      .filter((a) => a.type === "checking" || a.type === "savings")
      .reduce((s, a) => s + a.balance, 0) * 100
  ) / 100;

  // Upcoming income = active, unmatched income sources with expected_day still ahead
  const today = now.getDate();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const resolveDay = (day: number) => day === 0 ? lastDayOfMonth : day;
  const upcomingIncome = incomes
    .filter((i) => i.is_active && resolveDay(i.expected_day) > today && !matchedIncomeIds.has(i.id))
    .reduce((s, i) => s + i.amount, 0);

  // Daily budget: time-window cash flow simulation.
  // Find the lowest daily balance between now and month end.
  // This prevents future income (like salary on day 31) from inflating today's budget.
  const unpaidBillsList = bills.filter((b) => b.is_active && !b.is_paid);
  const unreceivedIncomes = incomes
    .filter((i) => i.is_active && resolveDay(i.expected_day) > today && !matchedIncomeIds.has(i.id));

  // Start with current balance minus saving goal minus overdue obligations
  let balance = availableBalance - savingRate;
  for (const bill of unpaidBillsList) {
    if (bill.due_day <= today || bill.due_day === 0) balance -= bill.amount;
  }
  for (const debt of debtItems) {
    if ((debt.dueDay <= today || debt.dueDay === 0) && debt.amount > 0) balance -= debt.amount;
  }

  // Walk each future day, track the minimum balance at each point
  // The daily budget = minimum future balance / days from that point
  let minDailyBudget = daysLeft > 0 ? balance / daysLeft : 0;
  let runningBalance = balance;
  for (let d = today + 1; d <= daysInMonth; d++) {
    for (const inc of unreceivedIncomes) {
      if (resolveDay(inc.expected_day) === d) runningBalance += inc.amount;
    }
    for (const bill of unpaidBillsList) {
      if (bill.due_day === d) runningBalance -= bill.amount;
    }
    for (const debt of debtItems) {
      if (debt.dueDay === d && debt.amount > 0) runningBalance -= debt.amount;
    }
    const daysFromHere = daysInMonth - d + 1;
    if (daysFromHere > 0) {
      const budgetFromHere = runningBalance / daysFromHere;
      if (budgetFromHere < minDailyBudget) minDailyBudget = budgetFromHere;
    }
  }

  const dailyBudget = Math.max(0, Math.round(minDailyBudget * 100) / 100);

  // Burn rate = average daily real spending this month
  const daysPassed = now.getDate();
  const realSpendingTotal = data.transactions
    .filter((t) => t.amount < 0 && !isTransfer(t.payee, t.category))
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const dailyBurnRate = daysPassed > 0 ? Math.round((realSpendingTotal / daysPassed) * 100) / 100 : 0;

  // Separate bills from discretionary for accurate projection
  const totalBillsAmount = bills.filter((b) => b.is_active).reduce((s, b) => s + b.amount, 0);
  const paidBillsAmount = bills
    .filter((b) => b.is_active && (matchedBillIds.has(b.id) || b.due_day < today))
    .reduce((s, b) => s + b.amount, 0);
  const unpaidBillsAmount = totalBillsAmount - paidBillsAmount;
  const discretionarySpending = Math.max(0, realSpendingTotal - paidBillsAmount);
  const dailyDiscretionary = daysPassed > 0 ? Math.round((discretionarySpending / daysPassed) * 100) / 100 : 0;

  const projectedMonthEnd = Math.round((availableBalance + upcomingIncome - unpaidBillsAmount - (dailyDiscretionary * daysLeft)) * 100) / 100;

  // Week-over-week spending trend
  const thisWeekStart = today - ((today - 1) % 7);
  const lastWeekStart = thisWeekStart - 7;
  const lastWeekEnd = thisWeekStart - 1;
  const thisWeekDays = today - thisWeekStart + 1;

  const spendInRange = (start: number, end: number) =>
    data.transactions
      .filter((t) => {
        const day = parseInt(t.date.split("-")[2], 10);
        return day >= start && day <= end && t.amount < 0 && !isTransfer(t.payee, t.category);
      })
      .reduce((s, t) => s + Math.abs(t.amount), 0);

  const thisWeekSpend = spendInRange(thisWeekStart, today);
  const lastWeekSpend = lastWeekStart >= 1 ? spendInRange(lastWeekStart, lastWeekEnd) : 0;

  // Normalize to daily average for fair comparison
  const thisWeekDaily = thisWeekDays > 0 ? thisWeekSpend / thisWeekDays : 0;
  const lastWeekDaily = lastWeekStart >= 1 ? lastWeekSpend / 7 : 0;
  const trendPercent = lastWeekDaily > 0 ? Math.round(((thisWeekDaily - lastWeekDaily) / lastWeekDaily) * 100) : 0;

  // Today's spending
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todaySpentAll = data.transactions
    .filter((t) => t.date === todayStr && t.amount < 0 && !isTransfer(t.payee, t.category))
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const todaySpentPersonal = data.transactions
    .filter((t) => t.date === todayStr && t.amount < 0 && !isTransfer(t.payee, t.category)
      && (linkedAccountIds.length === 0 || linkedAccountIds.includes(t.account_id || "")))
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const todayRemaining = dailyBudget - todaySpentAll;

  // Personal spending share: configured % or calculated from actual spending ratio
  const personalMonthSpend = data.transactions
    .filter((t) => t.amount < 0 && !isTransfer(t.payee, t.category)
      && (linkedAccountIds.length === 0 || linkedAccountIds.includes(t.account_id || "")))
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const calculatedShare = realSpendingTotal > 0 ? personalMonthSpend / realSpendingTotal : 0.5;
  const personalShare = personalBudgetShare > 0 ? personalBudgetShare / 100 : calculatedShare;
  const suggestedForYou = Math.max(0, Math.round((dailyBudget * personalShare - todaySpentPersonal) * 100) / 100);

  // Build spending chart data from transactions (exclude transfers)
  const spendingByDay: Record<string, number> = {};
  const sortedTx = [...data.transactions]
    .filter((t) => t.amount < 0 && !isTransfer(t.payee, t.category))
    .sort((a, b) => a.date.localeCompare(b.date));

  let cumulative = 0;
  for (const tx of sortedTx) {
    const day = parseInt(tx.date.split("-")[2], 10);
    cumulative += Math.abs(tx.amount);
    spendingByDay[day] = Math.round(cumulative);
  }

  // Combined income for charts
  const totalExpectedIncome = incomes
    .filter((i) => i.is_active)
    .reduce((s, i) => s + i.amount, 0);
  const combinedIncome = Math.max(realIncome, totalExpectedIncome);

  // Discretionary budget = income minus ALL fixed costs
  const totalBillsFull = bills.filter((b) => b.is_active).reduce((s, b) => s + b.amount, 0);
  const discretionaryBudget = Math.max(0, combinedIncome - savingRate - totalBillsFull - debtMonthly - investmentMonthly);
  const discretionaryTargetPerDay = discretionaryBudget > 0 ? discretionaryBudget / daysInMonth : 0;

  // Spending chart: ALL spending with Vakaa talous target (income - savings) / days
  const totalTargetPerDay = combinedIncome > 0 && savingRate > 0
    ? (combinedIncome - savingRate) / daysInMonth
    : 0;
  const spendingData = Array.from({ length: now.getDate() }, (_, i) => ({
    date: `${i + 1}.`,
    spent: spendingByDay[i + 1] || (i > 0 ? spendingByDay[i] || 0 : 0),
    ...(totalTargetPerDay > 0 ? { savingsTarget: Math.round(totalTargetPerDay * (i + 1)) } : {}),
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

  // Recent transactions (last 7, no transfers)
  const recentTransactions = [...data.transactions]
    .filter((tx) => !isTransfer(tx.payee, tx.category))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .map((tx) => ({
      id: tx.id,
      date: tx.date,
      payee: tx.payee,
      category: tx.category,
      amount: tx.amount,
    }));

  // Cash flow – current month + up to 3 historical months
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const historicalMonths = monthlyHistory
    .filter((s) => s.month !== currentMonthStr)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-3);

  const cashFlowData = [
    ...historicalMonths.map((s) => {
      const [y, m] = s.month.split("-");
      return {
        month: new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString(locale === "fi" ? "fi" : "en", { month: "short" }),
        income: Math.round(s.income),
        expenses: Math.round(s.expenses),
        net: Math.round(s.income - s.expenses),
      };
    }),
    {
      month: now.toLocaleDateString(locale === "fi" ? "fi" : "en", { month: "short" }),
      income: Math.round(combinedIncome),
      expenses: Math.round(monthActivity),
      net: Math.round(combinedIncome - monthActivity),
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <h1 className="page-heading">{t.dashboard.title}</h1>
        <div className="sync-row">
          {lastYnabSync && (
            <span className="sync-time">
              {formatDistanceToNow(new Date(lastYnabSync), { addSuffix: true, locale: locale === "fi" ? fiFns : enUS })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => sync()} disabled={loading}>
            <RefreshCw className={loading ? "icon-sm animate-spin" : "icon-sm"} />
          </Button>
        </div>
      </div>

      <EntryReminder
        lastTransactionDate={recentTransactions.length > 0 ? recentTransactions[0].date : null}
        onAddExpense={() => window.location.href = "/transactions"}
      />

      <PersonalGreeting
        todaySpentPersonal={todaySpentPersonal}
        todaySpentAll={todaySpentAll}
        dailyBudget={dailyBudget}
        todayRemaining={todayRemaining}
        suggestedForYou={suggestedForYou}
      />

      <SpendingFlow
        spendingByDay={spendingByDay as unknown as Record<number, number>}
        paidBillsAmount={paidBillsAmount}
        daysInMonth={daysInMonth}
        daysPassed={daysPassed}
        dailyDiscretionary={dailyDiscretionary}
        targetPerDay={discretionaryTargetPerDay}
        dailyBudget={dailyBudget}
      />

      <AiSummary />

      <DailyAllowance
        dailyBudget={dailyBudget}
        availableBalance={Math.round(availableBalance)}
        upcomingBills={bills.filter((b) => b.is_active && !b.is_paid).reduce((s, b) => s + b.amount, 0)}
        accountCount={data.summary.accounts.filter((a) => a.type === "checking" || a.type === "savings").length}
        billCount={bills.filter((b) => b.is_active && !b.is_paid).length}
        nextIncomeAmount={(() => {
          const next = incomes
            .filter((i) => i.is_active && resolveDay(i.expected_day) > today && !matchedIncomeIds.has(i.id))
            .sort((a, b) => a.expected_day - b.expected_day)[0];
          return next?.amount ?? 0;
        })()}
        nextIncomeDate={(() => {
          const next = incomes
            .filter((i) => i.is_active && resolveDay(i.expected_day) > today && !matchedIncomeIds.has(i.id))
            .sort((a, b) => a.expected_day - b.expected_day)[0];
          if (!next) return "";
          return `${next.expected_day}.${now.getMonth() + 1}. – ${next.name}`;
        })()}
        daysUntilIncome={(() => {
          const next = incomes
            .filter((i) => i.is_active && resolveDay(i.expected_day) > today && !matchedIncomeIds.has(i.id))
            .sort((a, b) => a.expected_day - b.expected_day)[0];
          return next ? next.expected_day - today : daysLeft;
        })()}
        burnRate={dailyBurnRate}
        projectedMonthEnd={projectedMonthEnd}
        todaySpentAll={todaySpentAll}
        todayRemaining={todayRemaining}
        monthIncome={combinedIncome}
        monthExpenses={Math.round(realSpendingTotal + unpaidBillsAmount + (dailyDiscretionary * daysLeft) + investmentMonthly + debtMonthly)}
        trendPercent={trendPercent}
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
