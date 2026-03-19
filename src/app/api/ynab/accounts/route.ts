/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getYnabToken, getYnabBudgetId } from "@/lib/household";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ accounts: [] }, { status: 401 });

    const token = getYnabToken();
    const budgetId = getYnabBudgetId();
    if (!token || !budgetId) return NextResponse.json({ accounts: [] });

    const { getBudgetSummary } = await import("@/lib/ynab/client");
    const summary = await getBudgetSummary(budgetId, token);

    const accounts = summary.accounts
      .filter((a: any) => (a.type === "checking" || a.type === "savings") && a.balance !== undefined)
      .map((a: any) => ({ id: a.id, name: a.name, balance: a.balance }));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("[ynab/accounts] Error:", error);
    return NextResponse.json({ accounts: [] }, { status: 500 });
  }
}
