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
import { Plus, Wallet, TrendingUp, Loader2, Link2, Check, X, Pencil, Trash2 } from "lucide-react";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [patterns, setPatterns] = useState<Record<number, { id: number; payee_pattern: string }[]>>({});
  const [monthlyMatches, setMonthlyMatches] = useState<Record<number, boolean>>({});
  const [addingPattern, setAddingPattern] = useState<number | null>(null);
  const [newPattern, setNewPattern] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ name: string; amount: string; expected_day: string }>({ name: "", amount: "", expected_day: "" });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    console.debug("[income] Loading income sources and matches");
    Promise.all([
      fetch("/api/income").then((r) => r.json()),
      fetch("/api/matches").then((r) => r.json()),
    ])
      .then(([incomeData, matchData]) => {
        if (incomeData.incomes) {
          console.info("[income] Loaded", incomeData.incomes.length, "sources");
          setIncomes(incomeData.incomes);
        }
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
    const form = formRef.current;
    if (!form) return;

    const fd = new FormData(form);
    const body = {
      name: fd.get("name") as string,
      amount: parseFloat(fd.get("amount") as string),
      expected_day: parseInt(fd.get("expected_day") as string, 10),
      is_recurring: (form.querySelector("#recurring") as HTMLInputElement)?.getAttribute("aria-checked") === "true",
    };

    console.info("[income] Adding income source:", body.name);

    try {
      const res = await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.id) {
        setIncomes((prev) => [...prev, {
          id: data.id,
          name: body.name,
          amount: body.amount,
          expected_day: body.expected_day,
          is_recurring: body.is_recurring ? 1 : 0,
          is_active: 1,
        }]);
        setDialogOpen(false);
        form.reset();
      }
    } catch (err) {
      console.error("[income] Add error:", err);
    }
  };

  const toggleIncome = async (id: number, currentActive: number) => {
    const newActive = currentActive ? 0 : 1;
    setIncomes((prev) => prev.map((i) => i.id === id ? { ...i, is_active: newActive } : i));
    console.info("[income] Toggling income", id, "active:", newActive);
    try {
      await fetch("/api/income", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: newActive }),
      });
    } catch (err) {
      console.error("[income] Toggle error:", err);
    }
  };

  const startEdit = (income: Income) => {
    setEditing(income.id);
    setEditData({
      name: income.name,
      amount: String(income.amount),
      expected_day: String(income.expected_day),
    });
  };

  const saveEdit = async (id: number) => {
    console.info("[income] Saving edit for", id);
    try {
      await fetch("/api/income", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: editData.name,
          amount: parseFloat(editData.amount),
          expected_day: parseInt(editData.expected_day, 10),
        }),
      });
      setIncomes((prev) => prev.map((i) => i.id === id ? {
        ...i,
        name: editData.name,
        amount: parseFloat(editData.amount),
        expected_day: parseInt(editData.expected_day, 10),
      } : i));
      setEditing(null);
    } catch (err) {
      console.error("[income] Edit error:", err);
    }
  };

  const deleteIncome = async (id: number) => {
    console.info("[income] Deleting income", id);
    try {
      await fetch("/api/income", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setIncomes((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error("[income] Delete error:", err);
    }
  };

  const formatExpectedDay = (day: number): string => {
    if (day === 0) return locale === "fi" ? "kuun viimeinen" : "last day";
    return `${day}.`;
  };

  const handleAddPattern = async (sourceId: number) => {
    if (!newPattern.trim()) return;
    console.info("[income] Adding pattern:", newPattern, "for source", sourceId);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_type: "income", source_id: sourceId, payee_pattern: newPattern.trim() }),
      });
      const data = await res.json();
      if (data.id) {
        setPatterns((prev) => ({
          ...prev,
          [sourceId]: [...(prev[sourceId] || []), { id: data.id, payee_pattern: newPattern.trim() }],
        }));
        setNewPattern("");
        setAddingPattern(null);
      }
    } catch (err) {
      console.error("[income] Add pattern error:", err);
    }
  };

  const handleRemovePattern = async (patternId: number, sourceId: number) => {
    console.info("[income] Removing pattern:", patternId);
    try {
      await fetch("/api/matches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: patternId }),
      });
      setPatterns((prev) => ({
        ...prev,
        [sourceId]: (prev[sourceId] || []).filter((p) => p.id !== patternId),
      }));
    } catch (err) {
      console.error("[income] Remove pattern error:", err);
    }
  };

  const active = incomes.filter((i) => i.is_active);
  const monthlyTotal = active.reduce((s, i) => s + i.amount, 0);
  const recurringTotal = active.filter((i) => i.is_recurring).reduce((s, i) => s + i.amount, 0);

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="page-loading-spinner animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">{t.income.title}</h1>
          <p className="page-subtitle">{t.income.subtitle}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="icon-sm" />
            {t.income.addIncome}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.income.addIncomeSource}</DialogTitle>
            </DialogHeader>
            <form ref={formRef} onSubmit={handleAdd} className="form-stack">
              <div className="form-field">
                <Label>{t.income.name}</Label>
                <Input name="name" placeholder={t.income.namePlaceholder} required />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>{t.income.amountEur}</Label>
                  <Input name="amount" type="number" step="0.01" placeholder="0.00" required />
                </div>
                <div className="form-field">
                  <Label>{t.income.expectedDay}</Label>
                  <Input name="expected_day" type="number" min="0" max="31" placeholder="0 = viimeinen" required />
                </div>
              </div>
              <div className="form-row">
                <Switch id="recurring" />
                <Label htmlFor="recurring">{t.income.recurringMonthly}</Label>
              </div>
              <Button type="submit">
                {t.income.addIncome}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="page-grid-2-sm">
        <Card className="metric-card">
          <p className="metric-card-label">{t.income.expectedMonthly}</p>
          <p className="metric-card-value-3xl text-positive">{monthlyTotal.toFixed(2)} €</p>
          <p className="metric-card-note metric-card-note-mt">
            {active.length} {t.common.sources}
          </p>
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
          {[...incomes]
            .sort((a, b) => a.expected_day - b.expected_day)
            .map((income) => (
              <div key={income.id} className="list-item list-item-col">
                {editing === income.id ? (
                  <div className="debt-edit-row">
                    <div className="debt-edit-field">
                      <Label className="debt-edit-label">{t.income.name}</Label>
                      <Input value={editData.name} onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))} className="debt-edit-input" />
                    </div>
                    <div className="debt-edit-field">
                      <Label className="debt-edit-label">€</Label>
                      <Input type="number" step="0.01" value={editData.amount} onChange={(e) => setEditData((d) => ({ ...d, amount: e.target.value }))} className="debt-edit-input" />
                    </div>
                    <div className="debt-edit-field">
                      <Label className="debt-edit-label">{locale === "fi" ? "Pv" : "Day"}</Label>
                      <Input type="number" min="0" max="31" value={editData.expected_day} onChange={(e) => setEditData((d) => ({ ...d, expected_day: e.target.value }))} placeholder="0 = last" className="debt-edit-input" />
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => saveEdit(income.id)}><Check /></Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditing(null)}><X /></Button>
                  </div>
                ) : (
                <>
                <div className="list-item-main">
                  <div className="list-item-icon" data-color="positive">
                    <Wallet />
                  </div>
                  <div className="list-item-body">
                    <div className="list-item-name-row">
                      <p className={`list-item-name ${!income.is_active ? "is-inactive" : ""}`}>{income.name}</p>
                      {monthlyMatches[income.id] && <Badge className="badge-matched"><Check className="icon-xs" />{locale === "fi" ? "Saatu" : "Received"}</Badge>}
                      {income.is_recurring ? <Badge variant="secondary">{t.income.recurring}</Badge> : null}
                    </div>
                    <p className="list-item-meta">
                      {t.income.expectedAround} {formatExpectedDay(income.expected_day)}
                      {(patterns[income.id] || []).length > 0 && (
                        <span className="list-item-patterns">
                          {" – "}{(patterns[income.id]).map((p) => p.payee_pattern).join(", ")}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="list-item-amount-value" data-positive>+{income.amount.toFixed(2)} €</p>
                </div>
                <div className="list-item-toolbar">
                  <div className="list-item-actions-row">
                    <button type="button" className="list-item-link-btn" onClick={() => startEdit(income)}><Pencil /></button>
                    <button type="button" className="list-item-link-btn" onClick={() => setAddingPattern(addingPattern === income.id ? null : income.id)}><Link2 /></button>
                    <button type="button" className="list-item-link-btn" onClick={() => deleteIncome(income.id)}><Trash2 /></button>
                  </div>
                  <Switch checked={!!income.is_active} onCheckedChange={() => toggleIncome(income.id, income.is_active)} />
                </div>
                </>
                )}
                {addingPattern === income.id && (
                  <div className="match-pattern-row">
                    <Input
                      value={newPattern}
                      onChange={(e) => setNewPattern(e.target.value)}
                      placeholder={locale === "fi" ? "esim. Digitoimisto Dude Oy tai *Dude*" : "e.g. Company Name or *partial*"}
                      className="match-pattern-input"
                    />
                    <Button type="button" size="sm" onClick={() => handleAddPattern(income.id)}>{locale === "fi" ? "Lisää" : "Add"}</Button>
                  </div>
                )}
                {addingPattern === income.id && (patterns[income.id] || []).length > 0 && (
                  <div className="match-pattern-list">
                    {(patterns[income.id]).map((p) => (
                      <span key={p.id} className="match-pattern-tag">
                        {p.payee_pattern}
                        <button type="button" className="match-pattern-remove" onClick={() => handleRemovePattern(p.id, income.id)}><X /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </Card>
      )}
    </div>
  );
}
