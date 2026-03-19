"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "@/lib/locale-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, TrendingUp, Loader2, Check } from "lucide-react";

interface Income {
  id: number;
  name: string;
  amount: number;
  expected_day: number;
  is_recurring: number;
  is_active: number;
}

export default function IncomePage() {
  const { t, locale } = useLocale();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Income | null>(null);
  const [monthlyMatches, setMonthlyMatches] = useState<Record<number, boolean>>({});
  const [patterns, setPatterns] = useState<Record<number, { id: number; payee_pattern: string }[]>>({});
  const addFormRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    console.debug("[income] Loading income sources and matches");
    Promise.all([
      fetch("/api/income").then((r) => r.json()),
      fetch("/api/matches").then((r) => r.json()),
    ])
      .then(([incomeData, matchData]) => {
        if (incomeData.incomes) setIncomes(incomeData.incomes);
        if (matchData.patterns) {
          const grouped: Record<number, { id: number; payee_pattern: string }[]> = {};
          for (const p of matchData.patterns) {
            if (p.source_type === "income") {
              if (!grouped[p.source_id]) grouped[p.source_id] = [];
              grouped[p.source_id].push({ id: p.id, payee_pattern: p.payee_pattern });
            }
          }
          setPatterns(grouped);
        }
        if (matchData.monthlyMatches) {
          const matched: Record<number, boolean> = {};
          for (const m of matchData.monthlyMatches) {
            if (m.source_type === "income") matched[m.source_id] = true;
          }
          setMonthlyMatches(matched);
        }
      })
      .catch((err) => console.error("[income] Load error:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = addFormRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const body = {
      name: fd.get("name") as string,
      amount: parseFloat((fd.get("amount") as string).replace(",", ".")),
      expected_day: parseInt(fd.get("expected_day") as string, 10),
      is_recurring: true,
    };
    console.info("[income] Adding:", body.name);
    try {
      const res = await fetch("/api/income", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.id) {
        setIncomes((prev) => [...prev, { id: data.id, ...body, is_recurring: 1, is_active: 1 }]);
        setAddOpen(false);
        form.reset();
      }
    } catch (err) { console.error("[income] Add error:", err); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editFormRef.current) return;
    const fd = new FormData(editFormRef.current);
    const body = {
      id: editTarget.id,
      name: fd.get("name") as string,
      amount: parseFloat((fd.get("amount") as string).replace(",", ".")),
      expected_day: parseInt(fd.get("expected_day") as string, 10),
    };
    console.info("[income] Editing:", body.id);
    try {
      await fetch("/api/income", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setIncomes((prev) => prev.map((i) => i.id === body.id ? { ...i, name: body.name, amount: body.amount, expected_day: body.expected_day } : i));
      setEditOpen(false);
      setEditTarget(null);
    } catch (err) { console.error("[income] Edit error:", err); }
  };

  const toggleIncome = async (id: number, currentActive: number) => {
    const newActive = currentActive ? 0 : 1;
    setIncomes((prev) => prev.map((i) => i.id === id ? { ...i, is_active: newActive } : i));
    try {
      await fetch("/api/income", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, is_active: newActive }) });
    } catch (err) { console.error("[income] Toggle error:", err); }
  };

  const deleteIncome = async (id: number) => {
    console.info("[income] Deleting:", id);
    try {
      await fetch("/api/income", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setIncomes((prev) => prev.filter((i) => i.id !== id));
    } catch (err) { console.error("[income] Delete error:", err); }
  };

  const formatDay = (day: number) => day === 0 ? (locale === "fi" ? "kuun viimeinen" : "last day") : `${day}.`;

  const active = incomes.filter((i) => i.is_active);
  const monthlyTotal = active.reduce((s, i) => s + i.amount, 0);
  const recurringTotal = active.filter((i) => i.is_recurring).reduce((s, i) => s + i.amount, 0);

  if (loading) {
    return <div className="page-loading"><Loader2 className="page-loading-spinner animate-spin" /></div>;
  }

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">{t.income.title}</h1>
          <p className="page-subtitle">{t.income.subtitle}</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="icon-sm" />
            {t.income.addIncome}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.income.addIncomeSource}</DialogTitle></DialogHeader>
            <form ref={addFormRef} onSubmit={handleAdd} className="form-stack">
              <div className="form-field">
                <Label>{t.income.name}</Label>
                <Input name="name" placeholder={t.income.namePlaceholder} required />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>{t.income.amountEur}</Label>
                  <Input name="amount" type="text" inputMode="decimal" placeholder="0.00" required />
                </div>
                <div className="form-field">
                  <Label>{t.income.expectedDay}</Label>
                  <Input name="expected_day" type="number" min="0" max="31" placeholder="0 = viimeinen" required />
                </div>
              </div>
              <Button type="submit">{t.income.addIncome}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="page-grid-2-sm">
        <Card className="metric-card">
          <p className="metric-card-label">{t.income.expectedMonthly}</p>
          <p className="metric-card-value-3xl text-positive">{monthlyTotal.toFixed(2)} €</p>
          <p className="metric-card-note metric-card-note-mt">{active.length} {t.common.sources}</p>
        </Card>
        <Card className="metric-card">
          <div className="page-header-row">
            <div>
              <p className="metric-card-label">{t.income.guaranteedRecurring}</p>
              <p className="metric-card-value-3xl">{recurringTotal.toFixed(2)} €</p>
              <p className="metric-card-note metric-card-note-mt">{t.income.reliableMonthlyIncome}</p>
            </div>
            <TrendingUp className="metric-card-icon-standalone text-positive" />
          </div>
        </Card>
      </div>

      {incomes.length > 0 && (
        <Card className="list-card list-card-divider">
          {[...incomes].sort((a, b) => a.expected_day - b.expected_day).map((income) => (
            <div
              key={income.id}
              className="list-item"
              onClick={() => { setEditTarget(income); setEditOpen(true); }}
            >
              <div className="list-item-body">
                <div className="list-item-name-row">
                  <p className={`list-item-name ${!income.is_active ? "is-inactive" : ""}`}>{income.name}</p>
                  {monthlyMatches[income.id] && <Badge className="badge-matched"><Check className="icon-xs" />{locale === "fi" ? "Saatu" : "Received"}</Badge>}
                  {income.is_recurring ? <Badge variant="secondary">{t.income.recurring}</Badge> : null}
                </div>
                <p className="list-item-meta">
                  {t.income.expectedAround} {formatDay(income.expected_day)}
                  {(patterns[income.id] || []).length > 0 && (
                    <span className="list-item-patterns"> – {patterns[income.id].map((p) => p.payee_pattern).join(", ")}</span>
                  )}
                </p>
              </div>
              <div className="list-item-end">
                <p className="list-item-amount-value" data-positive>+{income.amount.toFixed(2)} €</p>
                <span onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={!!income.is_active}
                    onCheckedChange={() => toggleIncome(income.id, income.is_active)}
                  />
                </span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{locale === "fi" ? "Muokkaa tuloa" : "Edit income"}</DialogTitle></DialogHeader>
          {editTarget && (
            <form ref={editFormRef} onSubmit={handleEdit} className="form-stack">
              <div className="form-field">
                <Label>{t.income.name}</Label>
                <Input name="name" defaultValue={editTarget.name} required />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>{t.income.amountEur}</Label>
                  <Input name="amount" type="text" inputMode="decimal" defaultValue={editTarget.amount} required />
                </div>
                <div className="form-field">
                  <Label>{t.income.expectedDay}</Label>
                  <Input name="expected_day" type="number" min="0" max="31" defaultValue={editTarget.expected_day} required />
                </div>
              </div>
              <div className="form-grid-2">
                <Button type="submit">{t.common.save}</Button>
                <Button type="button" variant="destructive" onClick={() => { deleteIncome(editTarget.id); setEditOpen(false); }}>
                  {t.common.delete}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
