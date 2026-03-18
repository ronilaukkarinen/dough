import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const db = getDb();
    const patterns = db.prepare("SELECT * FROM payee_matches ORDER BY source_type, source_id").all();

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthlyMatches = db.prepare("SELECT * FROM monthly_matches WHERE month = ?").all(month);

    console.debug("[matches] Loaded", (patterns as any[]).length, "patterns,", (monthlyMatches as any[]).length, "monthly matches");

    return NextResponse.json({ patterns, monthlyMatches, month });
  } catch (error) {
    console.error("[matches] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const { source_type, source_id, payee_pattern } = body;

    if (!source_type || !source_id || !payee_pattern) {
      return NextResponse.json({ error: "source_type, source_id and payee_pattern required" }, { status: 400 });
    }

    const db = getDb();
    const result = db
      .prepare("INSERT INTO payee_matches (source_type, source_id, payee_pattern) VALUES (?, ?, ?)")
      .run(source_type, source_id, payee_pattern);

    console.info("[matches] Added pattern:", payee_pattern, "for", source_type, source_id);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error("[matches] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = getDb();
    db.prepare("DELETE FROM payee_matches WHERE id = ?").run(id);

    console.info("[matches] Removed pattern ID:", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[matches] DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
