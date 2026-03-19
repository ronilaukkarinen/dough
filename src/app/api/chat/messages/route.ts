import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { eventBus } from "@/lib/event-bus";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ messages: [] }, { status: 401 });
    }

    const db = getDb();
    // Shared chat — show all messages from all household members
    const messages = db
      .prepare("SELECT cm.id, cm.role, cm.content, cm.created_at, u.display_name as sender FROM chat_messages cm LEFT JOIN users u ON cm.user_id = u.id ORDER BY cm.created_at ASC")
      .all() as { id: number; role: string; content: string; created_at: string; sender: string }[];

    console.debug("[chat/messages] Loaded", messages.length, "messages for user", user.id);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[chat/messages] GET error:", error);
    return NextResponse.json({ messages: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { role, content } = await request.json();

    if (!role || !content) {
      return NextResponse.json({ error: "Role and content required" }, { status: 400 });
    }

    const db = getDb();
    const result = db
      .prepare("INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)")
      .run(user.id, role, content);

    console.debug("[chat/messages] Saved", role, "message for user", user.id, "id:", result.lastInsertRowid);

    // Broadcast to all SSE clients
    eventBus.emit("chat:message", {
      id: result.lastInsertRowid,
      role,
      content,
      sender: user.display_name || user.email,
      userId: user.id,
    });

    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error("[chat/messages] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = getDb();
    db.prepare("DELETE FROM chat_messages WHERE user_id = ?").run(user.id);

    console.info("[chat/messages] Cleared chat for user", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[chat/messages] DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
