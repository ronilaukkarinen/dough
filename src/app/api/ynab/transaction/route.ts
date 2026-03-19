import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getYnabToken, getYnabBudgetId } from "@/lib/household";

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const token = getYnabToken();
    const budgetId = getYnabBudgetId();
    if (!token || !budgetId) {
      return NextResponse.json({ error: "YNAB not connected" }, { status: 400 });
    }

    const body = await request.json();
    const { account_id, amount, payee_name, date } = body;

    if (!account_id || !amount || !payee_name) {
      return NextResponse.json({ error: "Account, amount and payee required" }, { status: 400 });
    }

    console.info("[ynab/transaction] Creating transaction:", payee_name, amount);

    // YNAB amounts are in milliunits (1000 = 1.00)
    const milliunits = Math.round(parseFloat(amount) * -1000); // negative = expense

    const res = await fetch(`https://api.ynab.com/v1/budgets/${budgetId}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: {
          account_id,
          date: date || new Date().toISOString().slice(0, 10),
          amount: milliunits,
          payee_name,
          cleared: "uncleared",
          approved: false,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[ynab/transaction] YNAB error:", res.status, text);
      return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }

    const data = await res.json();
    console.info("[ynab/transaction] Transaction created:", data.data?.transaction?.id);

    return NextResponse.json({ success: true, id: data.data?.transaction?.id });
  } catch (error) {
    console.error("[ynab/transaction] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
