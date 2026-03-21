import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ notes: {} }, { status: 401 });

    const db = getDb();
    const rows = db
      .prepare("SELECT ynab_account_id, note FROM account_notes")
      .all() as { ynab_account_id: string; note: string }[];

    const notes: Record<string, string> = {};
    for (const r of rows) notes[r.ynab_account_id] = r.note;

    console.debug("[account-notes] Loaded", rows.length, "account notes");
    return NextResponse.json({ notes });
  } catch (error) {
    console.error("[account-notes] GET error:", error);
    return NextResponse.json({ notes: {} }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const { ynab_account_id, note } = body;

    if (!ynab_account_id) return NextResponse.json({ error: "Account ID required" }, { status: 400 });

    const db = getDb();
    if (note && note.trim()) {
      db.prepare(`
        INSERT INTO account_notes (ynab_account_id, note) VALUES (?, ?)
        ON CONFLICT(ynab_account_id) DO UPDATE SET note = excluded.note, updated_at = datetime('now')
      `).run(ynab_account_id, note.trim());
      console.info("[account-notes] Saved note for", ynab_account_id);
    } else {
      db.prepare("DELETE FROM account_notes WHERE ynab_account_id = ?").run(ynab_account_id);
      console.info("[account-notes] Removed note for", ynab_account_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[account-notes] PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
