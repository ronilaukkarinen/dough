"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/locale-context";
import { useYnab } from "@/lib/ynab-context";
import { usePathname } from "next/navigation";

export function FabAddExpense() {
  const { locale } = useLocale();
  const { refresh } = useYnab();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [payee, setPayee] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/ynab/accounts").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ]).then(([accData, profileData]) => {
      if (accData.accounts) setAccounts(accData.accounts);
      if (profileData.linkedAccountIds?.length > 0) setAccountId(profileData.linkedAccountIds[0]);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !payee || loading) return;
    setLoading(true);
    console.info("[fab] Adding expense:", payee, amount);
    try {
      const res = await fetch("/api/ynab/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId || accounts[0]?.id,
          amount: amount.replace(",", "."),
          payee_name: payee,
          memo: memo || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        console.info("[fab] Expense added:", data.id);
        setOpen(false);
        setAmount("");
        setPayee("");
        setMemo("");
        refresh();
      }
    } catch (err) {
      console.error("[fab] Add expense error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" className={`fab-add ${pathname === "/transactions" ? "is-hidden" : ""}`} onClick={() => setOpen(true)}>
        <Plus />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{locale === "fi" ? "Lisää kulu" : "Add expense"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="form-stack">
            <div className="form-field">
              <Label>{locale === "fi" ? "Summa" : "Amount"}</Label>
              <Input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-field">
              <Label>{locale === "fi" ? "Saaja" : "Payee"}</Label>
              <Input type="text" value={payee} onChange={(e) => setPayee(e.target.value)} placeholder={locale === "fi" ? "Esim. S-Market" : "E.g. grocery store"} />
            </div>
            <div className="form-field">
              <Label>{locale === "fi" ? "Tili" : "Account"}</Label>
              <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <Label>{locale === "fi" ? "Kuvaus" : "Memo"}</Label>
              <Input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={locale === "fi" ? "Valinnainen" : "Optional"} />
            </div>
            <Button type="submit" disabled={!amount || !payee || loading}>
              {loading ? <Loader2 className="icon-sm animate-spin" /> : (locale === "fi" ? "Lisää" : "Add")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
