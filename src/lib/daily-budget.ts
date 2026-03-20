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
  let startBalance = balance - savingGoal;
  for (const bill of unpaidBills) {
    if (bill.dueDay <= today || bill.dueDay === 0) startBalance -= bill.amount;
  }
  for (const debt of debts) {
    if ((debt.dueDay <= today || debt.dueDay === 0) && debt.amount > 0) startBalance -= debt.amount;
  }

  // Walk each future day up to salary day
  let minDailyBudget = startBalance / daysLeft;
  let runningBalance = startBalance;
  const budgetHorizon = Math.min(salaryDay, daysInMonth + 1);

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
    const daysUntilSalary = budgetHorizon - d;
    if (daysUntilSalary > 0) {
      const budgetFromHere = runningBalance / daysUntilSalary;
      if (budgetFromHere < minDailyBudget) minDailyBudget = budgetFromHere;
    }
  }

  return Math.max(0, Math.round(minDailyBudget * 100) / 100);
}
