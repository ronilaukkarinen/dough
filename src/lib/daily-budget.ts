/**
 * Calculate daily budget using segment-based cash flow simulation.
 *
 * Splits the remaining month into segments between income events.
 * Each segment has a pool of money (balance at segment start minus
 * obligations due in that segment). The daily budget is the tightest
 * segment — the one with the least money per day.
 *
 * No assumptions about "salary" or primary income — all income sources
 * are equal segment boundaries. Saving goal is reserved from the final
 * segment's pool (money to keep at month end).
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
  resolveDay: (day: number) => number;
}): DailyBudgetResult {
  const { balance, savingGoal, today, daysInMonth, unpaidBills, debts, unreceivedIncomes, resolveDay } = params;
  const daysLeft = daysInMonth - today;
  if (daysLeft <= 0) return { dailyBudget: 0, tightestSegment: null, segmentCount: 0 };

  // Start with current balance, subtract overdue obligations (due but unpaid)
  // Debts/bills with dueDay=0 (not set) are excluded
  let startBalance = balance;
  for (const bill of unpaidBills) {
    if (bill.dueDay > 0 && bill.dueDay <= today) startBalance -= bill.amount;
  }
  for (const debt of debts) {
    if (debt.dueDay > 0 && debt.dueDay <= today && debt.amount > 0) startBalance -= debt.amount;
  }

  // Build sorted list of income event days as segment boundaries
  const incomeDays = unreceivedIncomes
    .map((i) => resolveDay(i.expectedDay))
    .filter((d) => d > today && d <= daysInMonth);
  const uniqueDays = [...new Set(incomeDays)].sort((a, b) => a - b);

  // Segment boundaries: [today, income1, income2, ..., monthEnd]
  const boundaries = [today, ...uniqueDays, daysInMonth];

  console.debug("[daily-budget] balance:", Math.round(balance), "startBalance:", Math.round(startBalance), "savingGoal:", savingGoal, "today:", today, "daysLeft:", daysLeft, "segments:", boundaries.length - 1);

  // Walk segments, track running balance, find tightest daily budget
  let runningBalance = startBalance;
  let minDailyBudget = Infinity;
  let tightestSegment: DailyBudgetResult["tightestSegment"] = null;

  for (let s = 0; s < boundaries.length - 1; s++) {
    const segStart = boundaries[s];
    const segEnd = boundaries[s + 1];
    const segDays = segEnd - segStart;
    if (segDays <= 0) continue;

    // Add incomes arriving at this segment's start (except first segment which is "today")
    let incomeAtStart = 0;
    if (s > 0) {
      for (const inc of unreceivedIncomes) {
        if (resolveDay(inc.expectedDay) === segStart) {
          incomeAtStart += inc.amount;
          runningBalance += inc.amount;
        }
      }
    }

    // Subtract bills and debts due within this segment (segStart < dueDay <= segEnd)
    let segObligations = 0;
    for (const bill of unpaidBills) {
      if (bill.dueDay > segStart && bill.dueDay <= segEnd) {
        segObligations += bill.amount;
      }
    }
    for (const debt of debts) {
      if (debt.dueDay > segStart && debt.dueDay <= segEnd && debt.amount > 0) {
        segObligations += debt.amount;
      }
    }

    // Available pool for this segment = running balance minus obligations
    // For the last segment, also subtract saving goal (money to keep at month end)
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

    // Carry forward: balance after this segment = balance - obligations
    runningBalance -= segObligations;
  }

  // If no segments (no income events), simple division
  if (minDailyBudget === Infinity) {
    minDailyBudget = (startBalance - savingGoal) / daysLeft;
    tightestSegment = {
      startDay: today,
      endDay: daysInMonth,
      days: daysLeft,
      balanceAtStart: Math.round(startBalance * 100) / 100,
      incomeAtStart: 0,
      obligations: 0,
      savingGoalDeducted: Math.round(savingGoal * 100) / 100,
      pool: Math.round((startBalance - savingGoal) * 100) / 100,
    };
  }

  const result = Math.max(0, Math.round(minDailyBudget * 100) / 100);
  console.info("[daily-budget] Result:", result, "€/day across", boundaries.length - 1, "segments");
  return { dailyBudget: result, tightestSegment, segmentCount: boundaries.length - 1 };
}
