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
import { Plus, Wallet, TrendingUp, Loader2 } from "lucide-react";

interface Income {
  id: number;
  name: string;
  amount: number;
  expected_day: number;
  is_recurring: number;
  is_active: number;
}

export default function IncomePage() {
  const { t } = useLocale();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    console.debug("[income] Loading income sources");
    fetch("/api/income")
      .then((r) => r.json())
      .then((data) => {
        if (data.incomes) {
          console.info("[income] Loaded", data.incomes.length, "sources");
          setIncomes(data.incomes);
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
                  <Input name="expected_day" type="number" min="1" max="31" placeholder="1" required />
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
              <div key={income.id} className="list-item">
                <div className="list-item-icon" data-color="positive">
                  <Wallet />
                </div>
                <div className="list-item-body">
                  <div className="list-item-name-row">
                    <p className={`list-item-name ${!income.is_active ? "is-inactive" : ""}`}>{income.name}</p>
                    {income.is_recurring ? <Badge variant="secondary">{t.income.recurring}</Badge> : null}
                  </div>
                  <p className="list-item-meta">
                    {t.income.expectedAround} {income.expected_day}.
                  </p>
                </div>
                <div className="list-item-actions">
                  <p className="list-item-amount-value" data-positive>+{income.amount.toFixed(2)} €</p>
                  <Switch checked={!!income.is_active} onCheckedChange={() => toggleIncome(income.id, income.is_active)} />
                </div>
              </div>
            ))}
        </Card>
      )}
    </div>
  );
}
