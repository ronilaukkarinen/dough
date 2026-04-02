/**
 * Calculate daily budget using a rolling window approach.
 *
 * Looks ahead from today to find a sustainable daily spend rate.
 * Considers all income arriving and all obligations due within the window.
 * The window extends to the next major income (or 14 days minimum)
 * to prevent short-sighted budgeting around small income events.
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

export interface DailyBudgetResult {
  dailyBudget: number;
  tightestSegment: {
    startDay: number;
    endDay: number;
    days: number;
    balanceAtStart: number;
    incomeAtStart: number;
    obligations: number;
    savingGoalDeducted: number;
    pool: number;
  } | null;
  segmentCount: number;
}

export function calculateDailyBudget(params: {
  balance: number;
  savingGoal: number;
  today: number;
  daysInMonth: number;
  unpaidBills: BudgetBill[];
  debts: BudgetDebt[];
  unreceivedIncomes: BudgetIncome[];
  allIncomes?: BudgetIncome[];
  allBills?: BudgetBill[];
  allDebts?: BudgetDebt[];
  resolveDay: (day: number) => number;
}): DailyBudgetResult {
  const { balance, savingGoal, today, daysInMonth, unpaidBills, debts, unreceivedIncomes, allIncomes, allBills, allDebts, resolveDay } = params;

  // Build a 14-day minimum window, extending to cover at least one significant income
  // This prevents spending everything before a small income and starving the next period
  const minWindowDays = 14;

  // Collect all income events with absolute day positions
  const incomeEvents: { absDay: number; amount: number }[] = [];
  for (const i of unreceivedIncomes) {
    const d = resolveDay(i.expectedDay);
    if (d > today && d <= daysInMonth) {
      incomeEvents.push({ absDay: d, amount: i.amount });
    }
  }

  // Add next month's income events if window extends past month end
  if (allIncomes) {
    const allDays = allIncomes.map((i) => resolveDay(i.expectedDay)).sort((a, b) => a - b);
    for (const d of allDays) {
      incomeEvents.push({ absDay: daysInMonth + d, amount: allIncomes.find((i) => resolveDay(i.expectedDay) === d)!.amount });
    }
  }
  incomeEvents.sort((a, b) => a.absDay - b.absDay);

  // Window end: at least minWindowDays, but extend to cover the next income after that
  const minEnd = today + minWindowDays;
  const endAbsDay = Math.max(minEnd, incomeEvents.find((e) => e.absDay >= minEnd)?.absDay || minEnd);

  const totalDays = endAbsDay - today;
  if (totalDays <= 0) return { dailyBudget: 0, tightestSegment: null, segmentCount: 0 };

  // Total income arriving in window
  const windowIncome = incomeEvents
    .filter((e) => e.absDay > today && e.absDay <= endAbsDay)
    .reduce((s, e) => s + e.amount, 0);

  // Build obligations in window
  let windowObligations = 0;

  // This month's unpaid bills and debts
  for (const b of unpaidBills) {
    if (b.dueDay > today && b.dueDay <= Math.min(daysInMonth, endAbsDay)) {
      windowObligations += b.amount;
    }
  }
  for (const d of debts) {
    if (d.dueDay > today && d.dueDay <= Math.min(daysInMonth, endAbsDay) && d.amount > 0) {
      windowObligations += d.amount;
    }
  }

  // Next month's bills and debts if window extends past month end
  if (endAbsDay > daysInMonth) {
    const nextMonthEnd = endAbsDay - daysInMonth;
    if (allBills) {
      for (const b of allBills) {
        if (b.dueDay <= nextMonthEnd) {
          windowObligations += b.amount;
        }
      }
    }
    if (allDebts) {
      for (const d of allDebts) {
        if (d.dueDay <= nextMonthEnd && d.amount > 0) {
          windowObligations += d.amount;
        }
      }
    }
  }

  // Proportional saving goal for the window
  const dailySaving = daysInMonth > 0 ? savingGoal / daysInMonth : 0;
  const windowSaving = Math.round(dailySaving * totalDays * 100) / 100;

  // Pool = current balance + incoming income - obligations - savings
  const pool = balance + windowIncome - windowObligations - windowSaving;
  const dailyBudget = Math.max(0, Math.round((pool / totalDays) * 100) / 100);

  console.debug("[daily-budget] balance:", Math.round(balance), "windowIncome:", Math.round(windowIncome), "obligations:", Math.round(windowObligations), "saving:", Math.round(windowSaving), "pool:", Math.round(pool), "days:", totalDays, "daily:", dailyBudget);

  const tightestSegment = {
    startDay: today,
    endDay: endAbsDay,
    days: totalDays,
    balanceAtStart: Math.round(balance * 100) / 100,
    incomeAtStart: Math.round(windowIncome * 100) / 100,
    obligations: Math.round(windowObligations * 100) / 100,
    savingGoalDeducted: windowSaving,
    pool: Math.round(pool * 100) / 100,
  };

  console.info("[daily-budget] Result:", dailyBudget, "€/day over", totalDays, "day window");
  return { dailyBudget, tightestSegment, segmentCount: 1 };
}
