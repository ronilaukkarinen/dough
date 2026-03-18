import { api as YnabApi } from "ynab";

export function createYnabClient(accessToken?: string) {
  const token = accessToken || process.env.YNAB_ACCESS_TOKEN;
  if (!token) throw new Error("YNAB access token not configured");
  return new YnabApi(token);
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getBudgetSummary(budgetId: string, accessToken?: string) {
  const api = createYnabClient(accessToken);

  const [accountsResponse, categoriesResponse] = await Promise.all([
    api.accounts.getAccounts(budgetId),
    api.categories.getCategories(budgetId),
  ]);

  const accounts = (accountsResponse as any).accounts?.filter(
    (a: any) => !a.closed && !a.deleted
  ) ?? [];

  const totalBalance = accounts.reduce(
    (sum: number, a: any) => sum + (a.cleared_balance ?? a.clearedBalance ?? 0) + (a.uncleared_balance ?? a.unclearedBalance ?? 0),
    0
  ) / 1000;

  const categoryGroups = (categoriesResponse as any).categoryGroups ??
    (categoriesResponse as any).category_groups ?? [];

  const categories = categoryGroups
    .filter((g: any) => !g.hidden && !g.deleted)
    .flatMap((g: any) =>
      (g.categories ?? [])
        .filter((c: any) => !c.hidden && !c.deleted)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          group: g.name,
          budgeted: c.budgeted / 1000,
          activity: c.activity / 1000,
          balance: c.balance / 1000,
        }))
    );

  return {
    totalBalance,
    accounts: accounts.map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: ((a.cleared_balance ?? a.clearedBalance ?? 0) + (a.uncleared_balance ?? a.unclearedBalance ?? 0)) / 1000,
      clearedBalance: (a.cleared_balance ?? a.clearedBalance ?? 0) / 1000,
    })),
    categories,
  };
}

export async function getTransactions(
  budgetId: string,
  sinceDate?: string,
  accessToken?: string
) {
  const api = createYnabClient(accessToken);

  const response = await (api.transactions as any).getTransactionsByType(
    budgetId,
    "uncategorized",
    sinceDate
  );

  const transactions = (response as any).transactions ?? [];

  return transactions
    .filter((t: any) => !t.deleted)
    .map((t: any) => ({
      id: t.id,
      date: t.date,
      amount: t.amount / 1000,
      payee: t.payee_name ?? t.payeeName ?? "Unknown",
      category: t.category_name ?? t.categoryName ?? "Uncategorized",
      memo: t.memo,
      approved: t.approved,
      cleared: t.cleared,
    }));
}

export async function getMonthBudget(budgetId: string, month?: string, accessToken?: string) {
  const api = createYnabClient(accessToken);
  const targetMonth = month || new Date().toISOString().slice(0, 7) + "-01";

  const response = await api.months.getPlanMonth(budgetId, targetMonth);
  const monthData = (response as any).month ?? response;

  return {
    income: (monthData.income ?? 0) / 1000,
    budgeted: (monthData.budgeted ?? 0) / 1000,
    activity: (monthData.activity ?? 0) / 1000,
    toBeBudgeted: (monthData.to_be_budgeted ?? monthData.toBeBudgeted ?? 0) / 1000,
    categories: (monthData.categories ?? [])
      .filter((c: any) => !c.hidden && !c.deleted)
      .map((c: any) => ({
        name: c.name,
        budgeted: c.budgeted / 1000,
        activity: c.activity / 1000,
        balance: c.balance / 1000,
      })),
  };
}
