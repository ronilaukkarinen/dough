import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ snapshots: [] }, { status: 401 });

    const db = getDb();
    const snapshots = db
      .prepare("SELECT month, income, expenses, categories_json, saving_goal FROM monthly_snapshots ORDER BY month DESC LIMIT 4")
      .all() as { month: string; income: number; expenses: number; categories_json: string; saving_goal: number }[];

    console.debug("[monthly-history] Loaded", snapshots.length, "monthly snapshots");
    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error("[monthly-history] GET error:", error);
    return NextResponse.json({ snapshots: [] }, { status: 500 });
  }
}
