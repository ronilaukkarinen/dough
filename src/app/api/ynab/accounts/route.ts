import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ accounts: [] }, { status: 401 });

    const { getDb } = await import("@/lib/db");
    const db = getDb();

    const accounts = db.prepare(
      "SELECT id, name, balance FROM ynab_accounts WHERE (type = 'checking' OR type = 'savings') AND closed = 0 ORDER BY name"
    ).all() as { id: string; name: string; balance: number }[];

    console.debug("[ynab/accounts] Serving", accounts.length, "accounts from SQLite");
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("[ynab/accounts] Error:", error);
    return NextResponse.json({ accounts: [] }, { status: 500 });
  }
}
