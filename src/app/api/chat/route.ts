/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getFinancialAdvice } from "@/lib/ai/finance-advisor";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getYnabToken, getYnabBudgetId } from "@/lib/household";
import { eventBus } from "@/lib/event-bus";

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Get real YNAB data
    const user = await getSession();
    let context;

    if (user) {
      const token = getYnabToken();
      const budgetId = getYnabBudgetId();
      const locale = user.locale || "en";
      const { getHouseholdSetting } = await import("@/lib/household");
      const householdProfile = getHouseholdSetting("household_profile") || "";

      if (token && budgetId) {
        console.info("[chat] Loading YNAB data from cache");
        try {
          const now = new Date();

          // Use cached data instead of calling YNAB API directly
          const cached = getDb().prepare("SELECT data FROM ynab_cache WHERE id = 1").get() as { data: string } | undefined;
          if (!cached) throw new Error("No cached YNAB data");
          const ynabData = JSON.parse(cached.data);
          const { summary, transactions, monthBudget } = ynabData;

          const checkingSavings = summary.accounts
            .filter((a: any) => a.type === "checking" || a.type === "savings")
            .reduce((s: number, a: any) => s + a.balance, 0);

          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const daysLeft = daysInMonth - now.getDate();
          // Daily budget = checking+savings balance / days left (same as dashboard)
          const dailyBudget = daysLeft > 0 ? Math.round((checkingSavings / daysLeft) * 100) / 100 : 0;

          // Get debts from accounts
          const debts = summary.accounts
            .filter((a: any) => a.type === "otherDebt" && a.balance < 0)
            .map((a: any) => ({ name: a.name, remaining: Math.abs(a.balance), rate: 0 }));

          // Filter transfers
          const realIncomeTx = transactions.filter((t: any) => t.amount > 0 && !t.payee.startsWith("Transfer") && !t.payee.startsWith("Starting Balance") && !t.payee.startsWith("Reconciliation"));
          const realExpenseTx = transactions.filter((t: any) => t.amount < 0 && !t.payee.startsWith("Transfer") && !t.payee.startsWith("Starting Balance") && !t.payee.startsWith("Reconciliation") && t.category !== "Uncategorized");

          const recentTx = [...transactions]
            .filter((t: any) => !t.payee.startsWith("Transfer") && !t.payee.startsWith("Starting Balance") && !t.payee.startsWith("Reconciliation"))
            .sort((a: any, b: any) => b.date.localeCompare(a.date))
            .slice(0, 10)
            .map((t: any) => ({ date: t.date, payee: t.payee, amount: t.amount, category: t.category }));

          // Load recurring bills with paid/overdue status
          const chatDb = getDb();
          const bills = chatDb
            .prepare("SELECT id, name, amount, due_day FROM recurring_bills WHERE is_active = 1 ORDER BY due_day ASC")
            .all() as { id: number; name: string; amount: number; due_day: number }[];

          const chatMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const chatBillMatches = chatDb
            .prepare("SELECT source_id FROM monthly_matches WHERE source_type = 'bill' AND month = ?")
            .all(chatMonth) as { source_id: number }[];
          const paidBillIds = new Set(chatBillMatches.map((m) => m.source_id));

          const enrichedBills = bills.map((b) => ({
            name: b.name,
            amount: b.amount,
            dueDay: b.due_day,
            status: paidBillIds.has(b.id) ? "paid" : b.due_day < now.getDate() ? "overdue" : "upcoming",
          }));

          // Load income sources from DB
          const incomeRows = chatDb
            .prepare("SELECT name, amount, expected_day FROM income_sources WHERE is_active = 1 ORDER BY expected_day ASC")
            .all() as { name: string; amount: number; expected_day: number }[];

          context = {
            totalBalance: Math.round(checkingSavings * 100) / 100,
            monthlyIncome: Math.round(realIncomeTx.reduce((s: number, t: any) => s + t.amount, 0) * 100) / 100,
            monthlyExpenses: Math.round(realExpenseTx.reduce((s: number, t: any) => s + Math.abs(t.amount), 0) * 100) / 100,
            upcomingBills: enrichedBills,
            recentTransactions: recentTx,
            debts,
            incomeSources: incomeRows.map((i) => ({ name: i.name, amount: i.amount, expectedDay: i.expected_day })),
            dailyBudget,
            daysUntilNextIncome: daysLeft,
            locale,
            householdProfile,
            currentUser: user.display_name || user.email,
          };

          console.info("[chat] Context built with real data, balance:", context.totalBalance);
        } catch (err) {
          console.error("[chat] Failed to fetch YNAB data:", err);
        }
      }
    }

    // Fallback if no YNAB data
    if (!context) {
      console.warn("[chat] Using empty context, no YNAB data available");
      context = {
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        upcomingBills: [],
        recentTransactions: [],
        debts: [],
        incomeSources: [],
        dailyBudget: 0,
        daysUntilNextIncome: 0,
        locale: "en",
        householdProfile: "",
        currentUser: "unknown",
      };
    }

    const response = await getFinancialAdvice(messages, context);

    // Save assistant response to DB for persistence
    if (user && response) {
      try {
        const chatDb = getDb();
        chatDb.prepare("INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)")
          .run(user.id, "assistant", response);
        console.info("[chat] Saved assistant response to DB");
        eventBus.emit("chat:message", {
          id: chatDb.prepare("SELECT last_insert_rowid() as id").get(),
          role: "assistant",
          content: response,
          sender: null,
          userId: null,
        });
      } catch (err) {
        console.error("[chat] Failed to save response to DB:", err);
      }
    }

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error("[chat] API error:", error);
    return NextResponse.json(
      { message: "Sorry, something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
