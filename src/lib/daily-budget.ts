/**
 * Calculate daily budget using segment-based cash flow simulation.
 *
 * Splits the remaining days into segments between income events,
 * wrapping into next month. Each segment has a pool of money
 * (balance at segment start minus obligations due in that segment).
 * The daily budget is the tightest segment.
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

  // Find the next income after today — wrap into next month if needed
  // Use allIncomes (all active sources) to find the earliest income in next month
  const remainingThisMonth = unreceivedIncomes
    .map((i) => resolveDay(i.expectedDay))
    .filter((d) => d > today && d <= daysInMonth);

  let nextMonthFirstIncome = daysInMonth + 1; // default: tomorrow if no data
  if (allIncomes && allIncomes.length > 0) {
    // Find the earliest income day in next month = smallest expectedDay from all incomes
    const allDays = allIncomes.map((i) => resolveDay(i.expectedDay)).sort((a, b) => a - b);
    // The earliest income day wraps to next month as daysInMonth + that day
    nextMonthFirstIncome = daysInMonth + (allDays[0] || 1);
  }

  // Build absolute day timeline: today ... daysInMonth ... nextMonthFirstIncome
  // Income events this month
  const incomeEvents: { absDay: number; amount: number }[] = [];
  for (const i of unreceivedIncomes) {
    const d = resolveDay(i.expectedDay);
    if (d > today && d <= daysInMonth) {
      incomeEvents.push({ absDay: d, amount: i.amount });
    }
  }

  // End boundary: next month's first income
  const endAbsDay = incomeEvents.length > 0
    ? Math.max(...incomeEvents.map((e) => e.absDay), nextMonthFirstIncome)
    : nextMonthFirstIncome;

  // Total days we're budgeting across
  const totalDays = endAbsDay - today;
  if (totalDays <= 0) return { dailyBudget: 0, tightestSegment: null, segmentCount: 0 };

  // Build segment boundaries from income events
  const uniqueIncomeDays = [...new Set(incomeEvents.map((e) => e.absDay))].sort((a, b) => a - b);
  const boundaries = [today, ...uniqueIncomeDays, endAbsDay];

  // Build obligation timeline: this month's unpaid + next month's bills/debts before next income
  const obligations: { absDay: number; amount: number }[] = [];

  // This month's unpaid bills and debts
  for (const b of unpaidBills) {
    if (b.dueDay > today) obligations.push({ absDay: b.dueDay, amount: b.amount });
  }
  for (const d of debts) {
    if (d.dueDay > today && d.amount > 0) obligations.push({ absDay: d.dueDay, amount: d.amount });
  }

  // Next month's bills and debts before next month's first income
  if (allBills) {
    const nextIncomeDay = allIncomes ? Math.min(...allIncomes.map((i) => resolveDay(i.expectedDay))) : 31;
    for (const b of allBills) {
      if (b.dueDay <= nextIncomeDay) {
        obligations.push({ absDay: daysInMonth + b.dueDay, amount: b.amount });
      }
    }
  }
  if (allDebts) {
    const nextIncomeDay = allIncomes ? Math.min(...allIncomes.map((i) => resolveDay(i.expectedDay))) : 31;
    for (const d of allDebts) {
      if (d.dueDay <= nextIncomeDay && d.amount > 0) {
        obligations.push({ absDay: daysInMonth + d.dueDay, amount: d.amount });
      }
    }
  }

  console.debug("[daily-budget] balance:", Math.round(balance), "savingGoal:", savingGoal, "today:", today, "endAbsDay:", endAbsDay, "totalDays:", totalDays, "segments:", boundaries.length - 1);

  // Walk segments
  let runningBalance = balance;
  let minDailyBudget = Infinity;
  let tightestSegment: DailyBudgetResult["tightestSegment"] = null;

  for (let s = 0; s < boundaries.length - 1; s++) {
    const segStart = boundaries[s];
    const segEnd = boundaries[s + 1];
    const segDays = segEnd - segStart;
    if (segDays <= 0) continue;

    // Add incomes arriving at this segment's start
    let incomeAtStart = 0;
    if (s > 0) {
      for (const inc of incomeEvents) {
        if (inc.absDay === segStart) {
          incomeAtStart += inc.amount;
          runningBalance += inc.amount;
        }
      }
    }

    // Subtract obligations due within this segment
    let segObligations = 0;
    for (const ob of obligations) {
      if (ob.absDay > segStart && ob.absDay <= segEnd) {
        segObligations += ob.amount;
      }
    }

    // Last segment before next month's income: subtract saving goal
    const isLastSegment = s === boundaries.length - 2;
    const savingGoalDeducted = isLastSegment ? savingGoal : 0;
    const pool = runningBalance - segObligations - savingGoalDeducted;
    const dailyForSegment = pool / segDays;

    console.debug("[daily-budget] Segment", s + 1, "days", segStart + 1, "-", segEnd, `(${segDays}d)`, "balance:", Math.round(runningBalance), "obligations:", Math.round(segObligations), isLastSegment ? "savingGoal:" + savingGoal : "", "pool:", Math.round(pool), "daily:", Math.round(dailyForSegment));

    if (dailyForSegment < minDailyBudget) {
      minDailyBudget = dailyForSegment;
      tightestSegment = {
        startDay: segStart,
        endDay: segEnd,
        days: segDays,
        balanceAtStart: Math.round(runningBalance * 100) / 100,
        incomeAtStart: Math.round(incomeAtStart * 100) / 100,
        obligations: Math.round(segObligations * 100) / 100,
        savingGoalDeducted: Math.round(savingGoalDeducted * 100) / 100,
        pool: Math.round(pool * 100) / 100,
      };
    }

    runningBalance -= segObligations;
  }

  if (minDailyBudget === Infinity) {
    minDailyBudget = (balance - savingGoal) / Math.max(1, totalDays);
    tightestSegment = {
      startDay: today,
      endDay: endAbsDay,
      days: totalDays,
      balanceAtStart: Math.round(balance * 100) / 100,
      incomeAtStart: 0,
      obligations: 0,
      savingGoalDeducted: Math.round(savingGoal * 100) / 100,
      pool: Math.round((balance - savingGoal) * 100) / 100,
    };
  }

  const result = Math.max(0, Math.round(minDailyBudget * 100) / 100);
  console.info("[daily-budget] Result:", result, "€/day across", boundaries.length - 1, "segments");
  return { dailyBudget: result, tightestSegment, segmentCount: boundaries.length - 1 };
}
