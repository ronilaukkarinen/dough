import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ unread: 0 });

    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS transactions_last_seen (
      user_id INTEGER PRIMARY KEY,
      seen_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    const lastSeen = db.prepare("SELECT seen_at FROM transactions_last_seen WHERE user_id = ?").get(user.id) as { seen_at: string } | undefined;

    if (!lastSeen) {
      db.prepare("INSERT INTO transactions_last_seen (user_id) VALUES (?)").run(user.id);
      return NextResponse.json({ unread: 0 });
    }

    // Only show dot when a manual transaction was added (not auto-sync)
    const lastAdded = db.prepare("SELECT value FROM household_settings WHERE key = 'last_transaction_added'").get() as { value: string } | undefined;
    if (!lastAdded) return NextResponse.json({ unread: 0 });

    const addedTime = new Date(lastAdded.value).getTime();
    const seenTime = new Date(lastSeen.seen_at + "Z").getTime();

    const unread = addedTime > seenTime ? 1 : 0;

    return NextResponse.json({ unread });
  } catch (error) {
    console.error("[transactions/unread] Error:", error);
    return NextResponse.json({ unread: 0 });
  }
}

export async function POST() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS transactions_last_seen (
      user_id INTEGER PRIMARY KEY,
      seen_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    db.prepare(`
      INSERT INTO transactions_last_seen (user_id, seen_at) VALUES (?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET seen_at = datetime('now')
    `).run(user.id);

    console.debug("[transactions/unread] Marked as seen for user", user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[transactions/unread] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
