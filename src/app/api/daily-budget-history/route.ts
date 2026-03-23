import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ history: [] }, { status: 401 });

    const db = getDb();
    const history = db.prepare("SELECT date, budget, spent FROM daily_budget_history ORDER BY date DESC LIMIT 31").all();
    console.debug("[daily-budget-history] Loaded", (history as unknown[]).length, "entries");
    return NextResponse.json({ history });
  } catch (error) {
    console.error("[daily-budget-history] GET error:", error);
    return NextResponse.json({ history: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { date, budget, spent } = await request.json();
    if (!date || budget === undefined) return NextResponse.json({ error: "date and budget required" }, { status: 400 });

    const db = getDb();
    db.prepare(`
      INSERT INTO daily_budget_history (date, budget, spent) VALUES (?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET budget = excluded.budget, spent = excluded.spent
    `).run(date, budget, spent || 0);

    console.debug("[daily-budget-history] Saved", date, "budget:", budget, "spent:", spent);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[daily-budget-history] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
