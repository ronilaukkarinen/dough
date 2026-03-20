import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { memo } = await request.json();
    if (!memo) return NextResponse.json({ account_id: null });

    const db = getDb();
    const memoLower = memo.toLowerCase();

    // Get all users with their linked accounts
    const users = db
      .prepare("SELECT id, display_name FROM users WHERE id != ?")
      .all(user.id) as { id: number; display_name: string }[];

    console.debug("[resolve-account] Checking memo against", users.length, "other users");

    for (const u of users) {
      if (u.display_name && memoLower.includes(u.display_name.toLowerCase())) {
        // Found a match — get their linked account
        const linked = db
          .prepare("SELECT ynab_account_id FROM user_linked_accounts WHERE user_id = ? LIMIT 1")
          .get(u.id) as { ynab_account_id: string } | undefined;

        if (linked) {
          console.info("[resolve-account] Routed to", u.display_name, "account:", linked.ynab_account_id);
          return NextResponse.json({
            account_id: linked.ynab_account_id,
            account_name: u.display_name,
            routed_to: u.display_name,
          });
        }
      }
    }

    // No match — return current user's account
    const myLinked = db
      .prepare("SELECT ynab_account_id FROM user_linked_accounts WHERE user_id = ? LIMIT 1")
      .get(user.id) as { ynab_account_id: string } | undefined;

    return NextResponse.json({
      account_id: myLinked?.ynab_account_id || null,
      account_name: null,
      routed_to: null,
    });
  } catch (error) {
    console.error("[resolve-account] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
