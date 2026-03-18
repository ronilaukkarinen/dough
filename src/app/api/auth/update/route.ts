import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const db = getDb();

    if (body.locale) {
      console.info("[api/auth/update] Updating locale for user", user.id, "to", body.locale);
      db.prepare("UPDATE users SET locale = ?, updated_at = datetime('now') WHERE id = ?")
        .run(body.locale, user.id);
    }

    if (body.ynab_access_token !== undefined) {
      const value = body.ynab_access_token || null;
      console.info("[api/auth/update]", value ? "Saving" : "Clearing", "YNAB token for user", user.id);
      db.prepare("UPDATE users SET ynab_access_token = ?, updated_at = datetime('now') WHERE id = ?")
        .run(value, user.id);
    }

    if (body.ynab_budget_id !== undefined) {
      const value = body.ynab_budget_id || null;
      console.info("[api/auth/update]", value ? "Saving" : "Clearing", "YNAB budget ID for user", user.id);
      db.prepare("UPDATE users SET ynab_budget_id = ?, updated_at = datetime('now') WHERE id = ?")
        .run(value, user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/auth/update] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
