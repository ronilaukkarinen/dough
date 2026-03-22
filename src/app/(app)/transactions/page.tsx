"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "@/lib/locale-context";
import { isTransfer } from "@/lib/transaction-utils";
import { useYnab } from "@/lib/ynab-context";
import { relativeDate } from "@/lib/date-utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  RefreshCw,
  Loader2,
  Plus,
  Paperclip,
  X,
} from "lucide-react";
import { titleCasePayee } from "@/lib/text-utils";

type FilterType = "all" | "income" | "expenses" | "transfers";

export default function TransactionsPage() {
  const { t, locale, fmt } = useLocale();
  const { data, loading, connected, sync } = useYnab();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addPayee, setAddPayee] = useState("");
  const [addMemo, setAddMemo] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [linkedAccountName, setLinkedAccountName] = useState("");
  const [receiptParsing, setReceiptParsing] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptType, setReceiptType] = useState("");
  const [batchTransactions, setBatchTransactions] = useState<{ payee: string; amount: string; account_id: string; account_name: string }[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [allAccounts, setAllAccounts] = useState<{ id: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect user's linked account
  useEffect(() => {
    console.debug("[transactions] Loading user profile for account auto-detect");
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/ynab/accounts").then((r) => r.json()).catch(() => ({ accounts: [] })),
    ]).then(([profileData, accountsData]) => {
      if (accountsData.accounts) {
        setAllAccounts(accountsData.accounts.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
      }
      const ids = profileData.linkedAccountIds || [];
      if (ids.length > 0 && accountsData.accounts) {
        setLinkedAccountId(ids[0]);
        const account = accountsData.accounts.find((a: { id: string; name: string }) => a.id === ids[0]);
        if (account) setLinkedAccountName(account.name);
        console.info("[transactions] Auto-detected account:", account?.name || ids[0]);
      }
    }).catch(() => {});
  }, []);

  // Resolve account from memo (name-based routing)
  const resolveAccountFromMemo = async (memo: string) => {
    if (!memo.trim()) return;
    try {
      const res = await fetch("/api/receipt/resolve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo }),
      });
      const data = await res.json();
      if (data.account_id && data.account_id !== linkedAccountId) {
        setLinkedAccountId(data.account_id);
        setLinkedAccountName(data.account_name || "");
        console.info("[transactions] Routed to:", data.routed_to, data.account_name);
      }
    } catch {
      // ignore routing errors
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.info("[transactions] Receipt uploaded:", file.name, file.type, Math.round(file.size / 1024), "KB");
    setReceiptParsing(true);

    // Show preview
    const preview = URL.createObjectURL(file);
    setReceiptPreview(preview);
    setReceiptType(file.type);

    // Read as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      try {
        const res = await fetch("/api/receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, media_type: file.type }),
        });
        const data = await res.json();
        console.info("[transactions] Receipt parsed:", data.transactions?.length || 1, "transactions");

        if (data.transactions && data.transactions.length > 1) {
          // Multiple transactions — show batch review
          const batch = data.transactions.map((tx: { payee: string; amount: string; account?: string }) => {
            const payee = titleCasePayee(tx.payee || "");
            let accId = linkedAccountId;
            let accName = linkedAccountName;
            if (tx.account) {
              const matched = allAccounts.find((a) => a.name.toLowerCase().includes(tx.account!.toLowerCase()) || tx.account!.toLowerCase().includes(a.name.toLowerCase()));
              if (matched) { accId = matched.id; accName = matched.name; }
            }
            return { payee, amount: tx.amount, account_id: accId, account_name: accName };
          });
          setBatchTransactions(batch);
        } else {
          // Single transaction — fill fields
          if (data.payee) setAddPayee(titleCasePayee(data.payee));
          if (data.amount) setAddAmount(data.amount);
          if (data.account) resolveAccountFromMemo(data.account);
        }
      } catch (err) {
        console.error("[transactions] Receipt parse error:", err);
      } finally {
        setReceiptParsing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddExpense = async () => {
    if (!linkedAccountId || !addAmount || !addPayee) return;
    setAddLoading(true);
    console.info("[transactions] Adding expense:", addPayee, addAmount, "to account:", linkedAccountId);
    try {
      const res = await fetch("/api/ynab/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: linkedAccountId,
          amount: addAmount.replace(",", "."),
          payee_name: addPayee,
          memo: addMemo || undefined,
        }),
      });
      if (res.ok) {
        setAddOpen(false);
        setAddAmount("");
        setAddPayee("");
        setAddMemo("");
        setReceiptPreview(null);
        sync();
      }
    } catch (err) {
      console.error("[transactions] Add expense error:", err);
    } finally {
      setAddLoading(false);
    }
  };

  const handleBatchAdd = async () => {
    if (batchTransactions.length === 0) return;
    setBatchLoading(true);
    console.info("[transactions] Batch adding", batchTransactions.length, "expenses");
    let added = 0;
    for (const tx of batchTransactions) {
      if (!tx.payee || !tx.amount) continue;
      try {
        const res = await fetch("/api/ynab/transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: tx.account_id,
            amount: tx.amount.replace(",", "."),
            payee_name: tx.payee,
          }),
        });
        if (res.ok) added++;
      } catch (err) {
        console.error("[transactions] Batch add error for", tx.payee, err);
      }
    }
    console.info("[transactions] Batch added", added, "of", batchTransactions.length);
    setBatchTransactions([]);
    setReceiptPreview(null);
    setAddOpen(false);
    setBatchLoading(false);
    sync();
  };

  const removeBatchItem = (index: number) => {
    setBatchTransactions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBatchAccount = (index: number, accountId: string) => {
    const acc = allAccounts.find((a) => a.id === accountId);
    setBatchTransactions((prev) => prev.map((tx, i) => i === index ? { ...tx, account_id: accountId, account_name: acc?.name || "" } : tx));
  };

  const filterLabels: Record<FilterType, string> = {
    all: t.transactions.all,
    expenses: t.transactions.expenses,
    income: t.transactions.income,
    transfers: locale === "fi" ? "Siirrot" : "Transfers",
  };

  const transactions = data?.transactions ?? [];

  const filtered = transactions
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((tx) => {
      if (search && !tx.payee.toLowerCase().includes(search.toLowerCase()) && !tx.category.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      const txIsTransfer = isTransfer(tx.payee, tx.category);
      if (filter === "income" && (tx.amount < 0 || txIsTransfer)) return false;
      if (filter === "expenses" && (tx.amount >= 0 || txIsTransfer)) return false;
      if (filter === "transfers" && !txIsTransfer) return false;
      if (filter === "all" && txIsTransfer) return false;
      return true;
    });

  if (!connected) {
    return (
      <div className="page-stack">
        <div>
          <h1 className="page-heading">{t.transactions.title}</h1>
          <p className="page-subtitle">{t.settings.ynabDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">{t.transactions.title}</h1>
          <p className="page-subtitle">{t.transactions.subtitle}</p>
        </div>
        <div className="sync-row">
          <Button variant="outline" size="sm" onClick={() => sync()} disabled={loading}>
            <RefreshCw className={loading ? "icon-sm animate-spin" : "icon-sm"} />
          </Button>
          <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) { setReceiptPreview(null); setBatchTransactions([]); } }}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="icon-sm" />
              {locale === "fi" ? "Lisää kulu" : "Add expense"}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{locale === "fi" ? "Lisää puuttuva kulu" : "Add missing expense"}</DialogTitle>
              </DialogHeader>
              <div className="form-stack">
                {/* Attachment button — always visible at top */}
                <div className="settings-row">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleReceiptUpload}
                    hidden
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={receiptParsing}
                    className="w-full"
                  >
                    {receiptParsing ? <Loader2 className="icon-sm animate-spin" /> : <Paperclip className="icon-sm" />}
                    {receiptParsing
                      ? (locale === "fi" ? "Luetaan..." : "Reading...")
                      : (locale === "fi" ? "Liitä kuitti tai tiliote" : "Attach receipt or statement")}
                  </Button>
                </div>

                {receiptPreview && (
                  receiptType === "application/pdf"
                    ? <object data={receiptPreview} type="application/pdf" className="receipt-preview-pdf">{/* PDF */}</object>
                    : <img src={receiptPreview} alt="Receipt" className="receipt-preview" />
                )}

                {/* Batch mode: multiple transactions from receipt */}
                {batchTransactions.length > 0 ? (
                  <>
                    <p className="settings-help">{batchTransactions.length} {locale === "fi" ? "tapahtumaa tunnistettu" : "transactions detected"}</p>
                    <div className="batch-list">
                      {batchTransactions.map((tx, i) => (
                        <div key={i} className="batch-item">
                          <div className="batch-item-info">
                            <p className="batch-item-payee">{tx.payee}</p>
                            <p className="batch-item-meta">{tx.amount} € · {tx.account_name}</p>
                          </div>
                          <div className="batch-item-actions">
                            {allAccounts.length > 1 && (
                              <select
                                value={tx.account_id}
                                onChange={(e) => updateBatchAccount(i, e.target.value)}
                                className="batch-account-select"
                              >
                                {allAccounts.map((a) => (
                                  <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                              </select>
                            )}
                            <button type="button" className="batch-remove-btn" onClick={() => removeBatchItem(i)}>
                              <X />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button type="button" onClick={handleBatchAdd} disabled={batchLoading || batchTransactions.length === 0}>
                      {batchLoading
                        ? (locale === "fi" ? "Lisätään..." : "Adding...")
                        : (locale === "fi" ? `Lisää ${batchTransactions.length} tapahtumaa` : `Add ${batchTransactions.length} transactions`)}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Single transaction mode */}
                    {linkedAccountName && (
                      <p className="settings-help">{locale === "fi" ? "Tili" : "Account"}: {linkedAccountName}</p>
                    )}
                    <div className="form-field">
                      <Label>{locale === "fi" ? "Saaja" : "Payee"}</Label>
                      <Input value={addPayee} onChange={(e) => setAddPayee(e.target.value)} placeholder={locale === "fi" ? "esim. K-Market" : "e.g. Store name"} />
                    </div>
                    <div className="form-field">
                      <Label>{locale === "fi" ? "Summa (€)" : "Amount (€)"}</Label>
                      <Input type="text" inputMode="decimal" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="form-field">
                      <Label>{locale === "fi" ? "Kuvaus" : "Description"}</Label>
                      <Input
                        value={addMemo}
                        onChange={(e) => setAddMemo(e.target.value)}
                        onBlur={() => resolveAccountFromMemo(addMemo)}
                        placeholder={locale === "fi" ? "esim. Lotan bussikortti" : "e.g. Bus card for kids"}
                      />
                    </div>
                    <Button type="button" onClick={handleAddExpense} disabled={addLoading || !linkedAccountId || !addAmount || !addPayee}>
                      {addLoading ? (locale === "fi" ? "Lisätään..." : "Adding...") : (locale === "fi" ? "Lisää" : "Add")}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-bar-search">
          <Search className="filter-bar-search-icon" />
          <Input
            placeholder={t.transactions.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-with-icon"
          />
        </div>
        <div className="filter-bar-buttons">
          {(["all", "expenses", "income", "transfers"] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {filterLabels[f]}
            </Button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="page-loading">
          <Loader2 className="page-loading-spinner animate-spin" />
        </div>
      ) : (
        <Card className="list-card list-card-divider">
          {filtered.map((tx) => {
            const txIsTransfer = isTransfer(tx.payee, tx.category);
            return (
            <div key={tx.id} className="list-item">
              <div className="list-item-icon" data-color={txIsTransfer ? "chart-3" : tx.amount < 0 ? "negative" : "positive"}>
                {tx.amount < 0 ? <ArrowUpRight className="icon-sm" /> : <ArrowDownLeft className="icon-sm" />}
              </div>
              <div className="list-item-body">
                <div className="list-item-name-row">
                  <p className="list-item-name">{tx.payee}</p>
                  {txIsTransfer && <Badge variant="secondary">{locale === "fi" ? "Siirto" : "Transfer"}</Badge>}
                </div>
                <p className="list-item-meta">{tx.category}</p>
              </div>
              <div className="list-item-amount">
                <p className="list-item-amount-value" data-positive={tx.amount >= 0 || undefined}>
                  {tx.amount < 0 ? "-" : "+"}{fmt(Math.abs(tx.amount))} €
                </p>
                <p className="list-item-amount-date">{relativeDate(tx.date, locale)}</p>
              </div>
            </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="list-empty">
              <p>{locale === "fi" ? "Ei tapahtumia" : "No transactions"}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
