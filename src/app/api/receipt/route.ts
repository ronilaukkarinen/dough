import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryClaudeWithImage } from "@/lib/ai/claude-image";

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const { image, media_type } = body;

    if (!image || !media_type) {
      return NextResponse.json({ error: "Image and media_type required" }, { status: 400 });
    }

    console.info("[receipt] Parsing receipt image for user", user.id);

    const prompt = `Extract from this receipt or invoice image:
- amount: the total amount paid (number only, no currency symbol)
- payee: the store or company name
- date: the date in YYYY-MM-DD format

Reply with ONLY valid JSON, nothing else: {"amount":"...","payee":"...","date":"YYYY-MM-DD"}
If you cannot read the receipt clearly, still try your best guess.`;

    const result = await queryClaudeWithImage(prompt, image, media_type);

    if (result.error) {
      console.error("[receipt] Parse error:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Extract JSON from response (Claude might wrap it in markdown code block)
    let parsed;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.warn("[receipt] Failed to parse JSON from:", result.text);
    }

    if (!parsed) {
      console.warn("[receipt] Could not parse receipt, raw:", result.text);
      return NextResponse.json({ error: "Could not read receipt", raw: result.text }, { status: 422 });
    }

    console.info("[receipt] Parsed:", parsed.payee, parsed.amount, parsed.date);
    return NextResponse.json({
      amount: parsed.amount,
      payee: parsed.payee,
      date: parsed.date,
    });
  } catch (error) {
    console.error("[receipt] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
