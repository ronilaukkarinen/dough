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
import { Plus, CalendarClock, AlertCircle, Loader2 } from "lucide-react";

interface Bill {
  id: number;
  name: string;
  amount: number;
  due_day: number;
  category: string;
  is_active: number;
}

export default function BillsPage() {
  const { t } = useLocale();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    console.debug("[bills] Loading bills");
    fetch("/api/bills")
      .then((r) => r.json())
      .then((data) => {
        if (data.bills) {
          console.info("[bills] Loaded", data.bills.length, "bills");
          setBills(data.bills);
        }
      })
      .catch((err) => console.error("[bills] Load error:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const fd = new FormData(form);
    const body = {
      name: fd.get("name") as string,
      amount: (fd.get("amount") as string).replace(",", "."),
      due_day: parseInt(fd.get("due_day") as string, 10),
      category: fd.get("category") as string,
    };

    console.info("[bills] Adding bill:", body.name);

    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.id) {
        setBills((prev) => [...prev, {
          id: data.id,
          name: body.name,
          amount: parseFloat(body.amount),
          due_day: body.due_day,
          category: body.category || "",
          is_active: 1,
        }]);
        setDialogOpen(false);
        form.reset();
      }
    } catch (err) {
      console.error("[bills] Add error:", err);
    }
  };

  const toggleBill = async (id: number, currentActive: number) => {
    const newActive = currentActive ? 0 : 1;
    setBills((prev) => prev.map((b) => b.id === id ? { ...b, is_active: newActive } : b));
    console.info("[bills] Toggling bill", id, "active:", newActive);
    try {
      await fetch("/api/bills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: newActive }),
      });
    } catch (err) {
      console.error("[bills] Toggle error:", err);
    }
  };

  const today = new Date().getDate();
  const active = bills.filter((b) => b.is_active);
  const monthlyTotal = active.reduce((s, b) => s + b.amount, 0);
  const remainingThisMonth = active.filter((b) => b.due_day >= today).reduce((s, b) => s + b.amount, 0);

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
          <h1 className="page-heading">{t.bills.title}</h1>
          <p className="page-subtitle">{t.bills.subtitle}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="icon-sm" />
            {t.bills.addBill}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.bills.addRecurringBill}</DialogTitle>
            </DialogHeader>
            <form ref={formRef} onSubmit={handleAdd} className="form-stack">
              <div className="form-field">
                <Label>{t.bills.name}</Label>
                <Input name="name" placeholder={t.bills.namePlaceholder} required />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>{t.bills.amountEur}</Label>
                  <Input name="amount" type="text" inputMode="decimal" placeholder="0.00" required />
                </div>
                <div className="form-field">
                  <Label>{t.bills.dueDay}</Label>
                  <Input name="due_day" type="number" min="1" max="31" placeholder="1" required />
                </div>
              </div>
              <div className="form-field">
                <Label>{t.bills.category}</Label>
                <Input name="category" placeholder={t.bills.categoryPlaceholder} />
              </div>
              <Button type="submit">
                {t.bills.addBill}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="page-grid-2-sm">
        <Card className="metric-card">
          <p className="metric-card-label">{t.bills.monthlyTotal}</p>
          <p className="metric-card-value-3xl">{monthlyTotal.toFixed(2)} €</p>
          <p className="metric-card-note metric-card-note-mt">
            {active.length} {t.common.activeBills}
          </p>
        </Card>
        <Card className="metric-card">
          <div className="page-header-row">
            <div>
              <p className="metric-card-label">{t.bills.remainingThisMonth}</p>
              <p className="metric-card-value-3xl text-negative">{remainingThisMonth.toFixed(2)} €</p>
              <p className="metric-card-note metric-card-note-mt">{t.bills.stillDueBeforeMonthEnd}</p>
            </div>
            <AlertCircle className="metric-card-icon-standalone text-negative" />
          </div>
        </Card>
      </div>

      {bills.length > 0 && (
        <Card className="list-card list-card-divider">
          {[...bills]
            .sort((a, b) => a.due_day - b.due_day)
            .map((bill) => (
              <div key={bill.id} className="list-item">
                <div className="list-item-icon" data-color="chart-4">
                  <CalendarClock />
                </div>
                <div className="list-item-body">
                  <div className="list-item-name-row">
                    <p className={`list-item-name ${!bill.is_active ? "is-inactive" : ""}`}>{bill.name}</p>
                    {bill.due_day >= today && bill.due_day <= today + 3 && bill.is_active ? (
                      <Badge variant="destructive">{t.bills.dueSoon}</Badge>
                    ) : null}
                  </div>
                  <p className="list-item-meta">
                    {bill.category ? `${bill.category} · ` : ""}{t.bills.dueOn} {bill.due_day}.
                  </p>
                </div>
                <div className="list-item-actions">
                  <p className="list-item-amount-value">{bill.amount.toFixed(2)} €</p>
                  <Switch checked={!!bill.is_active} onCheckedChange={() => toggleBill(bill.id, bill.is_active)} />
                </div>
              </div>
            ))}
        </Card>
      )}
    </div>
  );
}
