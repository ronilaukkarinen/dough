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

    const prompt = `Extract ALL transactions/expenses from this receipt, invoice, or bank statement image.
For each transaction, extract:
- amount: the amount (number only, no currency symbol)
- payee: the store, company, or recipient name
- date: the date in YYYY-MM-DD format (if visible)
- account: the bank account or card name if visible (e.g. "Lotan tili", "Nordea Visa", "Revolut"). Leave empty if not shown.

If there is only ONE transaction, return a single-element array.
If there are MULTIPLE transactions (e.g. bank statement, multi-item list), return ALL of them.

Reply with ONLY a valid JSON array, nothing else:
[{"amount":"...","payee":"...","date":"YYYY-MM-DD","account":"..."}]

If you cannot read clearly, still try your best guess.`;

    const result = await queryClaudeWithImage(prompt, image, media_type);

    if (result.error) {
      console.error("[receipt] Parse error:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Extract JSON array or object from response
    let transactions: { amount: string; payee: string; date?: string; account?: string }[] = [];
    try {
      // Try array first
      const arrayMatch = result.text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        transactions = JSON.parse(arrayMatch[0]);
      } else {
        // Fallback to single object
        const objMatch = result.text.match(/\{[\s\S]*\}/);
        if (objMatch) {
          transactions = [JSON.parse(objMatch[0])];
        }
      }
    } catch {
      console.warn("[receipt] Failed to parse JSON from:", result.text);
    }

    if (transactions.length === 0) {
      console.warn("[receipt] Could not parse receipt, raw:", result.text);
      return NextResponse.json({ error: "Could not read receipt", raw: result.text }, { status: 422 });
    }

    console.info("[receipt] Parsed", transactions.length, "transactions");

    // Return both single-item backwards-compatible fields and full array
    return NextResponse.json({
      amount: transactions[0].amount,
      payee: transactions[0].payee,
      date: transactions[0].date,
      account: transactions[0].account || null,
      transactions,
    });
  } catch (error) {
    console.error("[receipt] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
