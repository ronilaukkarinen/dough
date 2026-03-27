import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { eventBus } from "@/lib/event-bus";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { messageId, emoji } = await request.json();
    if (!messageId || !emoji) {
      return NextResponse.json({ error: "messageId and emoji required" }, { status: 400 });
    }

    const db = getDb();

    // Toggle: if reaction exists, remove it. If not, add it.
    const existing = db.prepare(
      "SELECT id FROM chat_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?"
    ).get(messageId, user.id, emoji) as any;

    if (existing) {
      db.prepare("DELETE FROM chat_reactions WHERE id = ?").run(existing.id);
      console.debug("[chat/reactions] Removed reaction:", emoji, "from message", messageId);
    } else {
      db.prepare(
        "INSERT INTO chat_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)"
      ).run(messageId, user.id, emoji);
      console.debug("[chat/reactions] Added reaction:", emoji, "to message", messageId);
    }

    // Get updated reactions for this message
    const reactions = db.prepare(`
      SELECT emoji, COUNT(*) as count, GROUP_CONCAT(u.display_name) as users
      FROM chat_reactions r
      JOIN users u ON u.id = r.user_id
      WHERE r.message_id = ?
      GROUP BY emoji
    `).all(messageId) as { emoji: string; count: number; users: string }[];

    // Check which emojis current user has reacted with
    const myReactions = db.prepare(
      "SELECT emoji FROM chat_reactions WHERE message_id = ? AND user_id = ?"
    ).all(messageId, user.id) as { emoji: string }[];
    const myEmojis = new Set(myReactions.map((r) => r.emoji));

    const result = reactions.map((r) => ({
      emoji: r.emoji,
      count: r.count,
      users: r.users.split(","),
      mine: myEmojis.has(r.emoji),
    }));

    // Broadcast to all clients
    eventBus.emit("chat:reaction", { messageId, reactions: result });

    return NextResponse.json({ reactions: result });
  } catch (error) {
    console.error("[chat/reactions] Error:", error);
    return NextResponse.json({ error: "Failed to toggle reaction" }, { status: 500 });
  }
}
