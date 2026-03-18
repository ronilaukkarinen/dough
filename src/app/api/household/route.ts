import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getHouseholdSettings, setHouseholdSetting } from "@/lib/household";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const settings = getHouseholdSettings();
    console.debug("[household] Loaded settings:", Object.keys(settings).length, "keys");

    return NextResponse.json({
      settings: {
        ynab_connected: !!settings.ynab_access_token,
        ynab_budget_id: settings.ynab_budget_id || null,
        saving_rate: settings.saving_rate ? parseFloat(settings.saving_rate) : 0,
        saving_rate_type: settings.saving_rate_type || "fixed",
        last_ynab_sync: settings.last_ynab_sync || null,
      },
    });
  } catch (error) {
    console.error("[household] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    console.info("[household] Updating settings:", Object.keys(body));

    for (const [key, value] of Object.entries(body)) {
      if (value === null || value === "") {
        // Delete the setting
        const { getDb } = await import("@/lib/db");
        getDb().prepare("DELETE FROM household_settings WHERE key = ?").run(key);
        console.info("[household] Deleted setting:", key);
      } else {
        setHouseholdSetting(key, String(value));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[household] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
