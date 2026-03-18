import { NextResponse } from "next/server";
import { getBudgetSummary, getTransactions, getMonthBudget } from "@/lib/ynab/client";

export async function POST() {
  try {
    const budgetId = process.env.YNAB_BUDGET_ID || "default";
    const sinceDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const [summary, transactions, monthBudget] = await Promise.all([
      getBudgetSummary(budgetId),
      getTransactions(budgetId, sinceDate),
      getMonthBudget(budgetId),
    ]);

    // TODO: Save to Supabase for caching and historical tracking

    return NextResponse.json({
      success: true,
      data: {
        summary,
        transactions,
        monthBudget,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("YNAB sync error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync with YNAB" },
      { status: 500 }
    );
  }
}
