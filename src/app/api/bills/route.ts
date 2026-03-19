/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { eventBus } from "@/lib/event-bus";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ bills: [] }, { status: 401 });

    const db = getDb();
    const bills = db
      .prepare("SELECT id, name, amount, due_day, category, is_active FROM recurring_bills WHERE user_id = ? ORDER BY due_day ASC")
      .all(user.id) as any[];

    // Get matches for this month
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const matches = db
      .prepare("SELECT source_id, amount FROM monthly_matches WHERE source_type = 'bill' AND month = ?")
      .all(month) as { source_id: number; amount: number }[];
    const matchMap = new Map(matches.map((m) => [m.source_id, m.amount]));

    // Get payee patterns
    const patterns = db
      .prepare("SELECT source_id, payee_pattern FROM payee_matches WHERE source_type = 'bill'")
      .all() as { source_id: number; payee_pattern: string }[];
    const patternMap = new Map<number, string[]>();
    for (const p of patterns) {
      if (!patternMap.has(p.source_id)) patternMap.set(p.source_id, []);
      patternMap.get(p.source_id)!.push(p.payee_pattern);
    }

    // Get average amounts from history
    const averages = db
      .prepare("SELECT bill_id, AVG(amount) as avg_amount, COUNT(*) as count FROM bill_amount_history GROUP BY bill_id")
      .all() as { bill_id: number; avg_amount: number; count: number }[];
    const avgMap = new Map(averages.map((a) => [a.bill_id, { avg: a.avg_amount, count: a.count }]));

    const today = now.getDate();
    const enriched = bills.map((b: any) => {
      const isPaid = matchMap.has(b.id);
      const paidAmount = matchMap.get(b.id);
      const isOverdue = !isPaid && b.is_active && b.due_day < today;
      const isDueSoon = !isPaid && b.is_active && b.due_day >= today && b.due_day <= today + 3;
      const avg = avgMap.get(b.id);

      return {
        ...b,
        is_paid: isPaid,
        paid_amount: paidAmount || null,
        is_overdue: isOverdue,
        is_due_soon: isDueSoon,
        patterns: patternMap.get(b.id) || [],
        average_amount: avg ? Math.round(avg.avg * 100) / 100 : null,
        history_count: avg?.count || 0,
      };
    });

    console.debug("[bills] Loaded", bills.length, "bills,", matches.length, "paid this month");
    return NextResponse.json({ bills: enriched });
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
    eventBus.emit("data:updated", { source: "bill-added" });
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
    const { id } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = getDb();

    // Toggle active
    if (body.is_active !== undefined && Object.keys(body).length === 2) {
      db.prepare("UPDATE recurring_bills SET is_active = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
        .run(body.is_active ? 1 : 0, id, user.id);
      console.info("[bills] Toggled bill", id, "active:", body.is_active);
      eventBus.emit("data:updated", { source: "bill-toggled" });
      return NextResponse.json({ success: true });
    }

    // Full edit
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.name !== undefined) { updates.push("name = ?"); values.push(body.name); }
    if (body.amount !== undefined) {
      const newAmount = parseFloat(String(body.amount).replace(",", "."));
      updates.push("amount = ?");
      values.push(newAmount);

      // Record amount history
      const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      db.prepare(`
        INSERT INTO bill_amount_history (bill_id, amount, month) VALUES (?, ?, ?)
        ON CONFLICT(bill_id, month) DO UPDATE SET amount = excluded.amount
      `).run(id, newAmount, month);
    }
    if (body.due_day !== undefined) { updates.push("due_day = ?"); values.push(body.due_day); }
    if (body.category !== undefined) { updates.push("category = ?"); values.push(body.category); }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id, user.id);
      db.prepare(`UPDATE recurring_bills SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);
      console.info("[bills] Updated bill", id);
      eventBus.emit("data:updated", { source: "bill-updated" });
    }

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
    eventBus.emit("data:updated", { source: "bill-deleted" });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[bills] DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
