const TRANSFER_PAYEES = ["Transfer", "Starting Balance", "Reconciliation Balance Adjustment"];

export function isTransfer(payee: string, category?: string): boolean {
  if (TRANSFER_PAYEES.some((p) => payee.startsWith(p))) return true;
  if (category === "Uncategorized") return true;
  return false;
}
