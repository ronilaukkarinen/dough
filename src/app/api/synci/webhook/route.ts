import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getHouseholdSetting } from "@/lib/household";
import { getAllPatterns } from "@/lib/matching";
import { eventBus } from "@/lib/event-bus";
import crypto from "crypto";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Synci webhook receiver — processes bank transactions for income.
 * Only positive amounts (income) are processed. Expenses are ignored.
 *
 * Flow: Bank → Synci → this webhook → match income → create YNAB transaction → mark received in Dough
 *
 * Synci payload format:
 * {
 *   event_type: "transactions.created",
 *   event_id: "evt_123",
 *   data: {
 *     bank_account: { id: "acc_550", name: "S-tili", currency: "EUR" },
 *     transactions: [{ id, amount, booking_date, generated: { payee, description }, remittance_information: { unstructured } }]
 *   }
 * }
 */

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  try {
    const computed = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
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
    console.debug("[synci/webhook] Full payload:", JSON.stringify(body, null, 2));

    // Verify webhook signature
    const secret = getHouseholdSetting("synci_webhook_secret");
    if (secret) {
      const signature = req.headers.get("x-synci-signature") || "";
      if (!verifySignature(rawBody, signature, secret)) {
        console.warn("[synci/webhook] Invalid signature, rejecting");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
      console.debug("[synci/webhook] Signature verified");
    } else {
      console.warn("[synci/webhook] No webhook secret configured, skipping verification");
    }

    // Only process transaction events
    if (!["transactions.created", "transactions.updated"].includes(body.event_type)) {
      console.debug("[synci/webhook] Ignoring event type:", body.event_type);
      return NextResponse.json({ ok: true, skipped: true });
    }

    const bankAccount = body.data?.bank_account;
    const transactions = body.data?.transactions || [];
    const db = getDb();

    // Load account mapping: synci bank account ID → YNAB account ID
    let accountMapping: Record<string, string> = {};
    const mappingJson = getHouseholdSetting("synci_account_mapping");
    if (mappingJson) {
      try { accountMapping = JSON.parse(mappingJson); } catch {}
    }

    // Auto-register unknown Synci accounts so they appear in settings for mapping
    if (bankAccount?.id) {
      let knownAccounts: Record<string, string> = {};
      const knownJson = getHouseholdSetting("synci_known_accounts");
      if (knownJson) {
        try { knownAccounts = JSON.parse(knownJson); } catch {}
      }
      if (!knownAccounts[bankAccount.id]) {
        knownAccounts[bankAccount.id] = bankAccount.name || bankAccount.id;
        const { setHouseholdSetting } = await import("@/lib/household");
        setHouseholdSetting("synci_known_accounts", JSON.stringify(knownAccounts));
        console.info("[synci/webhook] Auto-registered Synci account:", bankAccount.id, bankAccount.name);
      }
    }

    // YNAB credentials
    const ynabToken = getHouseholdSetting("ynab_access_token");
    const ynabBudgetId = getHouseholdSetting("ynab_budget_id");
    const ynabAccountId = bankAccount?.id ? accountMapping[bankAccount.id] : null;

    console.info("[synci/webhook] Bank account:", bankAccount?.name, bankAccount?.id, "→ YNAB account:", ynabAccountId || "not mapped");

    const patterns = getAllPatterns().filter((p) => p.source_type === "income");
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let matched = 0;
    let ynabCreated = 0;

    for (const tx of transactions) {
      const amount = tx.amount ?? 0;
      const payee = tx.generated?.payee || tx.generated?.description || tx.remittance_information?.unstructured || "";
      const txId = tx.id || "";
      const txDate = tx.booking_date || tx.generated?.date || "";

      console.debug("[synci/webhook] Transaction:", { amount, payee, txId, date: txDate, booked: tx.booked });

      // Only process income (positive amounts)
      if (amount <= 0) {
        console.debug("[synci/webhook] Skipping expense:", amount);
        continue;
      }

      // Determine month from transaction date
      let matchMonth = currentMonth;
      if (txDate) {
        const parts = txDate.split("-");
        if (parts.length >= 2) matchMonth = `${parts[0]}-${parts[1]}`;
      }

      // Try to match against income source patterns
      let didMatch = false;
      for (const pattern of patterns) {
        const matcher = patternToMatcher(pattern.payee_pattern);
        if (!matcher(payee)) continue;
        if (pattern.min_amount > 0 && amount < pattern.min_amount) continue;
        if (pattern.max_amount > 0 && amount > pattern.max_amount) continue;

        const synciTxId = `synci_${txId}`;
        try {
          db.prepare(`
            INSERT OR IGNORE INTO monthly_matches (source_type, source_id, month, ynab_transaction_id, amount)
            VALUES (?, ?, ?, ?, ?)
          `).run("income", pattern.source_id, matchMonth, synciTxId, amount);

          db.prepare(`
            INSERT INTO income_amount_history (income_id, amount, month)
            VALUES (?, ?, ?)
            ON CONFLICT(income_id, month) DO UPDATE SET amount = excluded.amount
          `).run(pattern.source_id, amount, matchMonth);

          matched++;
          didMatch = true;
          console.info("[synci/webhook] Matched income:", payee, "→ source", pattern.source_id, "amount:", amount, "month:", matchMonth);
        } catch (err) {
          console.warn("[synci/webhook] Match insert error:", err);
        }
        break;
      }

      // Create transaction in YNAB if we have credentials and account mapping
      if (ynabToken && ynabBudgetId && ynabAccountId) {
        try {
          const { createTransaction } = await import("@/lib/ynab/client");
          await createTransaction(ynabBudgetId, ynabToken, {
            account_id: ynabAccountId,
            date: txDate || now.toISOString().slice(0, 10),
            amount,
            payee_name: payee,
            memo: didMatch ? "Synci: income auto-matched" : "Synci: auto-imported",
            cleared: "cleared",
          });
          ynabCreated++;
          console.info("[synci/webhook] Created YNAB transaction:", payee, amount, "in account", ynabAccountId);
        } catch (err) {
          console.error("[synci/webhook] YNAB create error:", err);
        }
      } else if (!ynabAccountId && bankAccount?.id) {
        console.warn("[synci/webhook] No YNAB account mapped for Synci account:", bankAccount.id, bankAccount.name);
      }
    }

    if (matched > 0 || ynabCreated > 0) {
      eventBus.emit("data:updated", { source: "synci-income" });
      console.info("[synci/webhook] Done: matched", matched, "income(s), created", ynabCreated, "YNAB transaction(s)");
    }

    return NextResponse.json({ ok: true, matched, ynabCreated });
  } catch (error) {
    console.error("[synci/webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// Synci may GET to verify endpoint availability
export async function GET() {
  return NextResponse.json({ status: "ok", service: "dough-synci-webhook" });
}
