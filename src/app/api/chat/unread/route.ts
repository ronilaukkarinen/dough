import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ unread: 0 });

    const db = getDb();

    // Ensure last_seen table
    db.exec(`CREATE TABLE IF NOT EXISTS chat_last_seen (
      user_id INTEGER PRIMARY KEY,
      message_id INTEGER NOT NULL DEFAULT 0
    )`);

    const lastSeen = db.prepare("SELECT message_id FROM chat_last_seen WHERE user_id = ?").get(user.id) as { message_id: number } | undefined;
    const lastSeenId = lastSeen?.message_id || 0;

    // Count messages from OTHER users after last seen
    const result = db.prepare("SELECT COUNT(*) as count FROM chat_messages WHERE id > ? AND user_id != ? AND role = 'user'").get(lastSeenId, user.id) as { count: number };

    return NextResponse.json({ unread: result.count });
  } catch (error) {
    console.error("[chat/unread] Error:", error);
    return NextResponse.json({ unread: 0 });
  }
}

export async function POST() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const db = getDb();

    db.exec(`CREATE TABLE IF NOT EXISTS chat_last_seen (
      user_id INTEGER PRIMARY KEY,
      message_id INTEGER NOT NULL DEFAULT 0
    )`);

    const latest = db.prepare("SELECT MAX(id) as max_id FROM chat_messages").get() as { max_id: number | null };

    db.prepare(`
      INSERT INTO chat_last_seen (user_id, message_id) VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET message_id = excluded.message_id
    `).run(user.id, latest?.max_id || 0);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[chat/unread] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
