import { NextResponse } from "next/server";
import { getFinancialAdvice } from "@/lib/ai/finance-advisor";

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // TODO: Pull real data from Supabase + YNAB
    // For now, use demo context
    const context = {
      totalBalance: 400,
      monthlyIncome: 4200,
      monthlyExpenses: 1750,
      upcomingBills: [
        { name: "Phone (Elisa)", amount: 30, dueDay: 20 },
        { name: "Insurance", amount: 120, dueDay: 22 },
        { name: "Electricity", amount: 89, dueDay: 25 },
        { name: "Tax Debt Payment", amount: 150, dueDay: 25 },
        { name: "Car Loan", amount: 270, dueDay: 28 },
      ],
      recentTransactions: [
        { date: "2026-03-18", payee: "S-Market", amount: -47.80, category: "Groceries" },
        { date: "2026-03-17", payee: "ABC-asema", amount: -52.10, category: "Transport" },
        { date: "2026-03-17", payee: "Netflix", amount: -17.99, category: "Subscriptions" },
        { date: "2026-03-16", payee: "Ravintola Savotta", amount: -38.50, category: "Restaurants" },
        { date: "2026-03-15", payee: "Salary", amount: 2100, category: "Income" },
      ],
      debts: [
        { name: "Car Loan", remaining: 8400, rate: 4.5 },
        { name: "Tax Debt", remaining: 2800, rate: 7 },
        { name: "Credit Card", remaining: 1200, rate: 18.5 },
      ],
      dailyBudget: 32,
      daysUntilNextIncome: 7,
      locale: "en",
    };

    const response = await getFinancialAdvice(messages, context);

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { message: "Sorry, I'm having trouble connecting right now. Please check that the API key is configured." },
      { status: 500 }
    );
  }
}
