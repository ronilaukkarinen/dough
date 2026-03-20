/**
 * Calculate daily budget using time-window cash flow simulation.
 * Finds the largest upcoming income (salary), treats obligations due on/after that day
 * as covered by salary. Walks each day before salary, tracking the minimum affordable
 * daily spend at each point — the tightest bottleneck becomes the daily budget.
 */

interface BudgetIncome {
  amount: number;
  expectedDay: number;
}

interface BudgetBill {
  amount: number;
  dueDay: number;
}

interface BudgetDebt {
  amount: number;
  dueDay: number;
}

export function calculateDailyBudget(params: {
  balance: number;
  savingGoal: number;
  today: number;
  daysInMonth: number;
  unpaidBills: BudgetBill[];
  debts: BudgetDebt[];
  unreceivedIncomes: BudgetIncome[];
  resolveDay: (day: number) => number;
}): number {
  const { balance, savingGoal, today, daysInMonth, unpaidBills, debts, unreceivedIncomes, resolveDay } = params;
  const daysLeft = daysInMonth - today;
  if (daysLeft <= 0) return 0;

  // Find the largest income source day (likely salary)
  const largestIncome = unreceivedIncomes.length > 0
    ? unreceivedIncomes.reduce((max, i) => i.amount > max.amount ? i : max, unreceivedIncomes[0])
    : null;
  const salaryDay = largestIncome ? resolveDay(largestIncome.expectedDay) : daysInMonth + 1;

  // Start with balance minus saving goal minus overdue obligations
  // Debts/bills with dueDay=0 (not set) are excluded — user needs to set due dates
  let startBalance = balance - savingGoal;
  for (const bill of unpaidBills) {
    if (bill.dueDay > 0 && bill.dueDay <= today) startBalance -= bill.amount;
  }
  for (const debt of debts) {
    if (debt.dueDay > 0 && debt.dueDay <= today && debt.amount > 0) startBalance -= debt.amount;
  }

  console.debug("[daily-budget] balance:", Math.round(balance), "savingGoal:", savingGoal, "startBalance:", Math.round(startBalance), "salaryDay:", salaryDay, "today:", today, "daysLeft:", daysLeft);

  // Walk each future day up to salary day
  const budgetHorizon = Math.min(salaryDay, daysInMonth + 1);
  const daysUntilSalary = budgetHorizon - today - 1;
  let minDailyBudget = daysUntilSalary > 0 ? startBalance / daysUntilSalary : startBalance / Math.max(1, daysLeft);
  let runningBalance = startBalance;

  for (let d = today + 1; d < budgetHorizon; d++) {
    // Add smaller incomes arriving this day (not salary)
    for (const inc of unreceivedIncomes) {
      if (resolveDay(inc.expectedDay) === d && inc !== largestIncome) {
        runningBalance += inc.amount;
      }
    }
    // Subtract bills and debts due this day
    for (const bill of unpaidBills) {
      if (bill.dueDay === d) runningBalance -= bill.amount;
    }
    for (const debt of debts) {
      if (debt.dueDay === d && debt.amount > 0) runningBalance -= debt.amount;
    }
    // Check if this is the tightest point
    const remainingDays = budgetHorizon - d;
    if (remainingDays > 0) {
      const budgetFromHere = runningBalance / remainingDays;
      if (budgetFromHere < minDailyBudget) {
        console.debug("[daily-budget] New min at day", d, "balance:", Math.round(runningBalance), "days:", remainingDays, "budget:", Math.round(budgetFromHere));
        minDailyBudget = budgetFromHere;
      }
    }
  }

  return Math.max(0, Math.round(minDailyBudget * 100) / 100);
}
