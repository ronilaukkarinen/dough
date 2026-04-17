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

  // Fixed 14-day window — no extension since we don't count future income
  const endAbsDay = today + minWindowDays;

  const totalDays = endAbsDay - today;
  if (totalDays <= 0) return { dailyBudget: 0, tightestSegment: null, segmentCount: 0 };

  // Collect obligations in window with absolute due day
  const obligationEvents: { absDay: number; amount: number }[] = [];
  for (const b of unpaidBills) {
    if (b.dueDay > today && b.dueDay <= Math.min(daysInMonth, endAbsDay)) {
      obligationEvents.push({ absDay: b.dueDay, amount: b.amount });
    }
  }
  for (const d of debts) {
    if (d.dueDay > today && d.dueDay <= Math.min(daysInMonth, endAbsDay) && d.amount > 0) {
      obligationEvents.push({ absDay: d.dueDay, amount: d.amount });
    }
  }
  if (endAbsDay > daysInMonth) {
    const nextMonthEnd = endAbsDay - daysInMonth;
    if (allBills) {
      for (const b of allBills) {
        if (b.dueDay <= nextMonthEnd) {
          obligationEvents.push({ absDay: daysInMonth + b.dueDay, amount: b.amount });
        }
      }
    }
    if (allDebts) {
      for (const d of allDebts) {
        if (d.dueDay <= nextMonthEnd && d.amount > 0) {
          obligationEvents.push({ absDay: daysInMonth + d.dueDay, amount: d.amount });
        }
      }
    }
  }
  obligationEvents.sort((a, b) => a.absDay - b.absDay);

  // Forward coverage: walk events chronologically. Credit incomes, debit obligations.
  // The max drop below starting balance is what current balance must reserve;
  // obligations covered by incoming income do not reserve against today's pool.
  // Incomes process before obligations on the same day.
  const events: { absDay: number; delta: number }[] = [
    ...incomeEvents.map((e) => ({ absDay: e.absDay, delta: e.amount })),
    ...obligationEvents.map((e) => ({ absDay: e.absDay, delta: -e.amount })),
  ].sort((a, b) => a.absDay - b.absDay || b.delta - a.delta);

  let runningLedger = balance;
  let maxShortfall = 0;
  for (const ev of events) {
    runningLedger += ev.delta;
    const shortfall = balance - runningLedger;
    if (shortfall > maxShortfall) maxShortfall = shortfall;
  }
  const windowObligations = maxShortfall;

  // Proportional saving goal for the window
  const dailySaving = daysInMonth > 0 ? savingGoal / daysInMonth : 0;
  const windowSaving = Math.round(dailySaving * totalDays * 100) / 100;

  // Pool = current balance - obligations-net-of-coverage - savings
  // Future income is NOT added to raise the pool; it only offsets obligations
  // it arrives in time to cover. This keeps the daily rate sustainable.
  const pool = balance - windowObligations - windowSaving;
  const dailyBudget = Math.max(0, Math.round((pool / totalDays) * 100) / 100);

  console.info("[daily-budget] balance:", Math.round(balance), "reservedObligations:", Math.round(windowObligations), "saving:", Math.round(windowSaving), "pool:", Math.round(pool), "days:", totalDays, "daily:", dailyBudget);

  const tightestSegment = {
    startDay: today,
    endDay: endAbsDay,
    days: totalDays,
    balanceAtStart: Math.round(balance * 100) / 100,
    incomeAtStart: 0,
    obligations: Math.round(windowObligations * 100) / 100,
    savingGoalDeducted: windowSaving,
    pool: Math.round(pool * 100) / 100,
  };

  console.info("[daily-budget] Result:", dailyBudget, "€/day over", totalDays, "day window");
  return { dailyBudget, tightestSegment, segmentCount: 1 };
}
