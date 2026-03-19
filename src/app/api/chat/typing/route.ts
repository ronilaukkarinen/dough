import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

// Simple typing indicator using household_settings
export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ typing: null });

    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS typing_status (
      user_id INTEGER PRIMARY KEY,
      display_name TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    // Get typing users (active in last 5 seconds), excluding current user
    const typingUsers = db
      .prepare("SELECT display_name FROM typing_status WHERE user_id != ? AND updated_at > datetime('now', '-5 seconds')")
      .all(user.id) as { display_name: string }[];

    return NextResponse.json({
      typing: typingUsers.length > 0 ? typingUsers.map((u) => u.display_name) : null,
    });
  } catch (error) {
    console.error("[chat/typing] GET error:", error);
    return NextResponse.json({ typing: null });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { typing } = await request.json();
    const db = getDb();

    db.exec(`CREATE TABLE IF NOT EXISTS typing_status (
      user_id INTEGER PRIMARY KEY,
      display_name TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    if (typing) {
      db.prepare(`
        INSERT INTO typing_status (user_id, display_name, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET updated_at = datetime('now')
      `).run(user.id, user.display_name || user.email);
    } else {
      db.prepare("DELETE FROM typing_status WHERE user_id = ?").run(user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[chat/typing] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
