import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getHouseholdSetting } from "@/lib/household";
import { getAllPatterns } from "@/lib/matching";
import { eventBus } from "@/lib/event-bus";
import crypto from "crypto";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Synci webhook receiver — processes bank transactions and auto-matches income.
 * Only positive amounts (income) are processed. Expenses are ignored.
 *
 * Webhook events: transactions.created, transactions.updated
 * Docs: https://docs.synci.io
 */

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  const computed = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

function patternToMatcher(pattern: string): (payee: string) => boolean {
  const trimmed = pattern.trim();
  if (trimmed.startsWith("*") && trimmed.endsWith("*")) {
    const inner = trimmed.slice(1, -1).toLowerCase();
    return (payee) => payee.toLowerCase().includes(inner);
  }
  if (trimmed.startsWith("*")) {
    const inner = trimmed.slice(1).toLowerCase();
    return (payee) => payee.toLowerCase().endsWith(inner);
  }
  if (trimmed.endsWith("*")) {
    const inner = trimmed.slice(0, -1).toLowerCase();
    return (payee) => payee.toLowerCase().startsWith(inner);
  }
  return (payee) => payee.toLowerCase() === trimmed.toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    console.info("[synci/webhook] Received event:", body.event_type, "id:", body.event_id);

    // Verify webhook signature
    const secret = getHouseholdSetting("synci_webhook_secret");
    if (secret) {
      const signature = req.headers.get("x-synci-signature") || req.headers.get("x-webhook-signature") || "";
      if (!verifySignature(rawBody, signature, secret)) {
        console.warn("[synci/webhook] Invalid signature, rejecting");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
      console.debug("[synci/webhook] Signature verified");
    } else {
      console.warn("[synci/webhook] No webhook secret configured, skipping signature verification");
    }

    // Only process transaction events
    if (!["transactions.created", "transactions.updated"].includes(body.event_type)) {
      console.debug("[synci/webhook] Ignoring event type:", body.event_type);
      return NextResponse.json({ ok: true, skipped: true });
    }

    const transactions = Array.isArray(body.data) ? body.data : [body.data];
    const db = getDb();
    const patterns = getAllPatterns().filter((p) => p.source_type === "income");
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let matched = 0;

    for (const tx of transactions) {
      // Extract transaction fields — Synci uses various field names
      const amount = tx.amount ?? tx.transaction_amount?.amount ?? 0;
      const payee = tx.remittance_information || tx.creditor_name || tx.debtor_name || tx.description || "";
      const txId = tx.id || tx.transaction_id || tx.internal_transaction_id || "";
      const txDate = tx.booking_date || tx.value_date || tx.date || "";

      console.debug("[synci/webhook] Transaction:", { amount, payee, txId, date: txDate });

      // Only process income (positive amounts)
      if (amount <= 0) {
        console.debug("[synci/webhook] Skipping expense:", amount);
        continue;
      }

      // Try to match against income source patterns
      for (const pattern of patterns) {
        const matcher = patternToMatcher(pattern.payee_pattern);
        if (!matcher(payee)) continue;

        // Check amount range if configured
        if (pattern.min_amount > 0 && amount < pattern.min_amount) continue;
        if (pattern.max_amount > 0 && amount > pattern.max_amount) continue;

        // Determine month from transaction date or use current
        let matchMonth = month;
        if (txDate) {
          const parts = txDate.split("-");
          if (parts.length >= 2) {
            matchMonth = `${parts[0]}-${parts[1]}`;
          }
        }

        // Insert match
        const synciTxId = `synci_${txId}`;
        try {
          db.prepare(`
            INSERT OR IGNORE INTO monthly_matches (source_type, source_id, month, ynab_transaction_id, amount)
            VALUES (?, ?, ?, ?, ?)
          `).run("income", pattern.source_id, matchMonth, synciTxId, amount);

          // Also record in income amount history
          db.prepare(`
            INSERT INTO income_amount_history (income_id, amount, month)
            VALUES (?, ?, ?)
            ON CONFLICT(income_id, month) DO UPDATE SET amount = excluded.amount
          `).run(pattern.source_id, amount, matchMonth);

          matched++;
          console.info("[synci/webhook] Matched income:", payee, "->", pattern.source_type, pattern.source_id, "amount:", amount, "month:", matchMonth);
        } catch (err) {
          console.warn("[synci/webhook] Match insert error:", err);
        }

        break; // One match per transaction
      }
    }

    if (matched > 0) {
      // Notify clients to refresh
      eventBus.emit("data:updated", { source: "synci-income" });
      console.info("[synci/webhook] Matched", matched, "income transaction(s), notified clients");
    }

    return NextResponse.json({ ok: true, matched });
  } catch (error) {
    console.error("[synci/webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// Synci may send GET to verify endpoint
export async function GET() {
  return NextResponse.json({ status: "ok", service: "dough-synci-webhook" });
}
