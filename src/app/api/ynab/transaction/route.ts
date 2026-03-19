import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getYnabToken, getYnabBudgetId } from "@/lib/household";
import { eventBus } from "@/lib/event-bus";
import { spawn } from "child_process";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function aiCategorize(payeeName: string, categories: string[]): Promise<string | null> {
  const claudePath = process.env.CLAUDE_PATH || "claude";
  const prompt = `Given the payee "${payeeName}", which category fits best from this list? Reply with ONLY the exact category name, nothing else.\n\nCategories:\n${categories.join("\n")}`;

  try {
    console.debug("[ynab/transaction] AI categorizing:", payeeName);
    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn(claudePath, ["-p", "-"], { timeout: 30000 });
      let stdout = "";
      proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.on("close", (code: number) => {
        if (code === 0 && stdout.trim()) resolve(stdout.trim());
        else reject(new Error("AI categorization failed"));
      });
      proc.on("error", reject);
      proc.stdin.write(prompt);
      proc.stdin.end();
    });

    const match = categories.find((c) => c.toLowerCase() === result.toLowerCase());
    if (match) {
      console.info("[ynab/transaction] AI categorized as:", match);
      return match;
    }
    console.debug("[ynab/transaction] AI returned unknown category:", result);
    return null;
  } catch (err) {
    console.warn("[ynab/transaction] AI categorization error:", err);
    return null;
  }
}

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
    const { account_id, amount, payee_name, memo, category_id, date } = body;

    if (!account_id || !amount || !payee_name) {
      return NextResponse.json({ error: "Account, amount and payee required" }, { status: 400 });
    }

    console.info("[ynab/transaction] Creating transaction:", payee_name, amount);

    // YNAB amounts are in milliunits (1000 = 1.00)
    const milliunits = Math.round(parseFloat(amount) * -1000);

    // Auto-categorize if no category provided
    let resolvedCategoryId = category_id || null;
    if (!resolvedCategoryId) {
      try {
        const { getBudgetSummary } = await import("@/lib/ynab/client");
        const summary = await getBudgetSummary(budgetId, token);
        const categoryNames = summary.categories
          .filter((c: any) => c.name !== "Inflow: Ready to Assign")
          .map((c: any) => c.name);

        const aiCategory = await aiCategorize(payee_name, categoryNames);
        if (aiCategory) {
          const found = summary.categories.find((c: any) => c.name === aiCategory);
          if (found) resolvedCategoryId = found.id;
        }
      } catch (err) {
        console.warn("[ynab/transaction] Category lookup failed:", err);
      }
    }

    const transaction: any = {
      account_id,
      date: date || new Date().toISOString().slice(0, 10),
      amount: milliunits,
      payee_name,
      cleared: "cleared",
      approved: true,
    };

    if (memo) transaction.memo = memo;
    if (resolvedCategoryId) transaction.category_id = resolvedCategoryId;

    const res = await fetch(`https://api.ynab.com/v1/budgets/${budgetId}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transaction }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[ynab/transaction] YNAB error:", res.status, text);
      return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }

    const data = await res.json();
    console.info("[ynab/transaction] Transaction created:", data.data?.transaction?.id, "category:", resolvedCategoryId || "uncategorized");

    eventBus.emit("data:updated", { source: "transaction-added" });

    return NextResponse.json({
      success: true,
      id: data.data?.transaction?.id,
      category: resolvedCategoryId ? "auto" : "uncategorized",
    });
  } catch (error) {
    console.error("[ynab/transaction] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
