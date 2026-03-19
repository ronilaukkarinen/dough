import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { eventBus } from "@/lib/event-bus";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ investments: [] }, { status: 401 });

    const db = getDb();
    const investments = db
      .prepare("SELECT id, name, monthly_amount, expected_day, expected_return, current_value, is_active FROM investments ORDER BY expected_day ASC")
      .all() as { id: number; name: string; monthly_amount: number; expected_day: number; expected_return: number; current_value: number; is_active: number }[];

    // Get matches for this month
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const matches = db
      .prepare("SELECT source_id, amount FROM monthly_matches WHERE source_type = 'investment' AND month = ?")
      .all(month) as { source_id: number; amount: number }[];
    const matchMap = new Map(matches.map((m) => [m.source_id, m.amount]));

    // Get payee patterns
    const patterns = db
      .prepare("SELECT source_id, payee_pattern FROM payee_matches WHERE source_type = 'investment'")
      .all() as { source_id: number; payee_pattern: string }[];
    const patternMap = new Map<number, string[]>();
    for (const p of patterns) {
      if (!patternMap.has(p.source_id)) patternMap.set(p.source_id, []);
      patternMap.get(p.source_id)!.push(p.payee_pattern);
    }

    const enriched = investments.map((inv) => ({
      ...inv,
      is_paid: matchMap.has(inv.id),
      paid_amount: matchMap.get(inv.id) || null,
      patterns: patternMap.get(inv.id) || [],
    }));

    console.debug("[investments] Loaded", investments.length, "investments,", matches.length, "paid this month");
    return NextResponse.json({ investments: enriched });
  } catch (error) {
    console.error("[investments] GET error:", error);
    return NextResponse.json({ investments: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const { name, monthly_amount, expected_day, expected_return, current_value } = body;

    if (!name || !monthly_amount) {
      return NextResponse.json({ error: "Name and monthly amount required" }, { status: 400 });
    }

    const db = getDb();
    const result = db
      .prepare("INSERT INTO investments (user_id, name, monthly_amount, expected_day, expected_return, current_value) VALUES (?, ?, ?, ?, ?, ?)")
      .run(
        user.id,
        name,
        parseFloat(String(monthly_amount).replace(",", ".")),
        expected_day || 1,
        expected_return ?? 7,
        parseFloat(String(current_value || 0).replace(",", "."))
      );

    console.info("[investments] Created investment:", name, "id:", result.lastInsertRowid);
    eventBus.emit("data:updated", { source: "investment-added" });
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error("[investments] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = getDb();

    // Toggle active
    if (body.is_active !== undefined && Object.keys(body).length === 2) {
      db.prepare("UPDATE investments SET is_active = ?, updated_at = datetime('now') WHERE id = ?")
        .run(body.is_active ? 1 : 0, id);
      console.info("[investments] Toggled investment", id, "active:", body.is_active);
      eventBus.emit("data:updated", { source: "investment-toggled" });
      return NextResponse.json({ success: true });
    }

    // Full edit
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
    if (body.monthly_amount !== undefined) {
      updates.push("monthly_amount = ?");
      values.push(parseFloat(String(body.monthly_amount).replace(",", ".")));
    }
    if (body.expected_day !== undefined) { updates.push("expected_day = ?"); values.push(body.expected_day); }
    if (body.expected_return !== undefined) {
      updates.push("expected_return = ?");
      values.push(parseFloat(String(body.expected_return).replace(",", ".")));
    }
    if (body.current_value !== undefined) {
      updates.push("current_value = ?");
      values.push(parseFloat(String(body.current_value).replace(",", ".")));
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id);
      db.prepare(`UPDATE investments SET ${updates.join(", ")} WHERE id = ?`).run(...values);
      console.info("[investments] Updated investment", id);
      eventBus.emit("data:updated", { source: "investment-updated" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[investments] PUT error:", error);
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
    db.prepare("DELETE FROM investments WHERE id = ?").run(id);
    // Clean up patterns
    db.prepare("DELETE FROM payee_matches WHERE source_type = 'investment' AND source_id = ?").run(id);

    console.info("[investments] Deleted investment", id);
    eventBus.emit("data:updated", { source: "investment-deleted" });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[investments] DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
