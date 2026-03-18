import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createYnabClient } from "@/lib/ynab/client";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = getDb();
    const row = db
      .prepare("SELECT ynab_access_token FROM users WHERE id = ?")
      .get(user.id) as { ynab_access_token: string | null } | undefined;

    const token = row?.ynab_access_token;
    if (!token) {
      return NextResponse.json({ error: "YNAB not connected" }, { status: 400 });
    }

    console.info("[api/ynab/budgets] Fetching budgets for user", user.id);
    const api = createYnabClient(token);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const response = await (api as any).budgets.getBudgets();
    const budgets = ((response as any).budgets ?? (response as any).data?.budgets ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
    }));

    console.info("[api/ynab/budgets] Found", budgets.length, "budgets");
    return NextResponse.json({ budgets });
  } catch (error) {
    console.error("[api/ynab/budgets] Error:", error);
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 });
  }
}
