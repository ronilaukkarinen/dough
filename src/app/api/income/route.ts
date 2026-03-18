import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ incomes: [] }, { status: 401 });

    const db = getDb();
    const incomes = db
      .prepare("SELECT id, name, amount, expected_day, is_recurring, is_active FROM income_sources WHERE user_id = ? ORDER BY expected_day ASC")
      .all(user.id);

    console.debug("[income] Loaded", (incomes as unknown[]).length, "income sources for user", user.id);
    return NextResponse.json({ incomes });
  } catch (error) {
    console.error("[income] GET error:", error);
    return NextResponse.json({ incomes: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const { name, amount, expected_day, is_recurring } = body;

    if (!name || !amount || !expected_day) {
      return NextResponse.json({ error: "Name, amount and expected day required" }, { status: 400 });
    }

    const db = getDb();
    const result = db
      .prepare("INSERT INTO income_sources (user_id, name, amount, expected_day, is_recurring) VALUES (?, ?, ?, ?, ?)")
      .run(user.id, name, amount, expected_day, is_recurring ? 1 : 0);

    console.info("[income] Created income source:", name, "id:", result.lastInsertRowid);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error("[income] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const { id, is_active } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = getDb();
    db.prepare("UPDATE income_sources SET is_active = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
      .run(is_active ? 1 : 0, id, user.id);

    console.info("[income] Updated income source", id, "active:", is_active);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[income] PUT error:", error);
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
    db.prepare("DELETE FROM income_sources WHERE id = ? AND user_id = ?").run(id, user.id);

    console.info("[income] Deleted income source", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[income] DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
