import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ bills: [] }, { status: 401 });

    const db = getDb();
    const bills = db
      .prepare("SELECT id, name, amount, due_day, category, is_active FROM recurring_bills WHERE user_id = ? ORDER BY due_day ASC")
      .all(user.id);

    console.debug("[bills] Loaded", (bills as unknown[]).length, "bills for user", user.id);
    return NextResponse.json({ bills });
  } catch (error) {
    console.error("[bills] GET error:", error);
    return NextResponse.json({ bills: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const { name, amount, due_day, category } = body;

    if (!name || !amount || !due_day) {
      return NextResponse.json({ error: "Name, amount and due day required" }, { status: 400 });
    }

    const db = getDb();
    const result = db
      .prepare("INSERT INTO recurring_bills (user_id, name, amount, due_day, category) VALUES (?, ?, ?, ?, ?)")
      .run(user.id, name, parseFloat(String(amount).replace(",", ".")), due_day, category || "");

    console.info("[bills] Created bill:", name, "id:", result.lastInsertRowid);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error("[bills] POST error:", error);
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
    db.prepare("UPDATE recurring_bills SET is_active = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
      .run(is_active ? 1 : 0, id, user.id);

    console.info("[bills] Toggled bill", id, "active:", is_active);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[bills] PUT error:", error);
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
    db.prepare("DELETE FROM recurring_bills WHERE id = ? AND user_id = ?").run(id, user.id);

    console.info("[bills] Deleted bill", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[bills] DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
