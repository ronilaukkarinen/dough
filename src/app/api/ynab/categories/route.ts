/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getYnabToken, getYnabBudgetId } from "@/lib/household";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ categories: [] }, { status: 401 });

    const token = getYnabToken();
    const budgetId = getYnabBudgetId();
    if (!token || !budgetId) return NextResponse.json({ categories: [] });

    const { getBudgetSummary } = await import("@/lib/ynab/client");
    const summary = await getBudgetSummary(budgetId, token);

    const categories = summary.categories
      .filter((c: any) => c.name !== "Inflow: Ready to Assign")
      .map((c: any) => ({ id: c.id, name: c.name, group: c.group }));

    console.debug("[ynab/categories] Loaded", categories.length, "categories");
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("[ynab/categories] Error:", error);
    return NextResponse.json({ categories: [] }, { status: 500 });
  }
}
