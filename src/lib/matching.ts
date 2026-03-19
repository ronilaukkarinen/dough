import { getDb } from "./db";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PayeeMatch {
  id: number;
  source_type: "income" | "bill";
  source_id: number;
  payee_pattern: string;
}

interface MonthlyMatch {
  id: number;
  source_type: "income" | "bill";
  source_id: number;
  month: string;
  ynab_transaction_id: string;
  amount: number;
}

export function getPayeePatterns(sourceType: "income" | "bill", sourceId: number): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT payee_pattern FROM payee_matches WHERE source_type = ? AND source_id = ?")
    .all(sourceType, sourceId) as { payee_pattern: string }[];
  return rows.map((r) => r.payee_pattern);
}

export function addPayeePattern(sourceType: "income" | "bill", sourceId: number, pattern: string): void {
  const db = getDb();
  db.prepare("INSERT INTO payee_matches (source_type, source_id, payee_pattern) VALUES (?, ?, ?)")
    .run(sourceType, sourceId, pattern);
  console.info("[matching] Added pattern:", pattern, "for", sourceType, sourceId);
}

export function removePayeePattern(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM payee_matches WHERE id = ?").run(id);
  console.info("[matching] Removed pattern ID:", id);
}

export function getAllPatterns(): PayeeMatch[] {
  const db = getDb();
  return db.prepare("SELECT * FROM payee_matches").all() as PayeeMatch[];
}

export function getMonthlyMatches(month: string): MonthlyMatch[] {
  const db = getDb();
  return db.prepare("SELECT * FROM monthly_matches WHERE month = ?").all(month) as MonthlyMatch[];
}

export function isMatchedThisMonth(sourceType: "income" | "bill", sourceId: number, month: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM monthly_matches WHERE source_type = ? AND source_id = ? AND month = ? LIMIT 1")
    .get(sourceType, sourceId, month);
  return !!row;
}

function patternToMatcher(pattern: string): (payee: string) => boolean {
  const trimmed = pattern.trim();

  // *wildcard* syntax: *Dude* matches anything containing "Dude"
  if (trimmed.startsWith("*") && trimmed.endsWith("*")) {
    const inner = trimmed.slice(1, -1).toLowerCase();
    return (payee) => payee.toLowerCase().includes(inner);
  }

  // *suffix syntax: *Oy matches anything ending with "Oy"
  if (trimmed.startsWith("*")) {
    const inner = trimmed.slice(1).toLowerCase();
    return (payee) => payee.toLowerCase().endsWith(inner);
  }

  // prefix* syntax: Dude* matches anything starting with "Dude"
  if (trimmed.endsWith("*")) {
    const inner = trimmed.slice(0, -1).toLowerCase();
    return (payee) => payee.toLowerCase().startsWith(inner);
  }

  // Exact match (case insensitive)
  return (payee) => payee.toLowerCase() === trimmed.toLowerCase();
}

export function runAutoMatch(transactions: any[], month: string): { matched: number; details: string[] } {
  const db = getDb();
  const patterns = getAllPatterns();
  let matched = 0;
  const details: string[] = [];

  for (const pattern of patterns) {
    const matcher = patternToMatcher(pattern.payee_pattern);
    const matchingTx = transactions.find((tx: any) => {
      const payee = tx.payee || tx.payee_name || "";
      return matcher(payee);
    });

    if (matchingTx) {
      const txId = matchingTx.id || matchingTx.ynab_id || "";
      try {
        db.prepare(`
          INSERT OR IGNORE INTO monthly_matches (source_type, source_id, month, ynab_transaction_id, amount)
          VALUES (?, ?, ?, ?, ?)
        `).run(pattern.source_type, pattern.source_id, month, txId, Math.abs(matchingTx.amount));
        matched++;
        details.push(`${pattern.source_type}:${pattern.source_id} matched "${matchingTx.payee || matchingTx.payee_name}" (${txId})`);
        console.debug("[matching] Matched", pattern.source_type, pattern.source_id, "to", matchingTx.payee || matchingTx.payee_name);
      } catch {
        // Already matched, skip
      }
    }
  }

  console.info("[matching] Auto-match complete:", matched, "new matches for", month);
  return { matched, details };
}
