"use client";

import { useState } from "react";
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
import { Plus, Wallet, TrendingUp } from "lucide-react";

interface Income {
  id: string;
  name: string;
  amount: number;
  expectedDay: number;
  isRecurring: boolean;
  isActive: boolean;
}

// TODO: Load from database

export default function IncomePage() {
  const { t } = useLocale();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const monthlyTotal = incomes.filter((i) => i.isActive).reduce((s, i) => s + i.amount, 0);
  const recurringTotal = incomes.filter((i) => i.isActive && i.isRecurring).reduce((s, i) => s + i.amount, 0);

  const toggleIncome = (id: string) => {
    setIncomes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isActive: !i.isActive } : i))
    );
  };

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
            <form className="form-stack">
              <div className="form-field">
                <Label>{t.income.name}</Label>
                <Input placeholder={t.income.namePlaceholder} />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>{t.income.amountEur}</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="form-field">
                  <Label>{t.income.expectedDay}</Label>
                  <Input type="number" min="1" max="31" placeholder="1" />
                </div>
              </div>
              <div className="form-row">
                <Switch id="recurring" />
                <Label htmlFor="recurring">{t.income.recurringMonthly}</Label>
              </div>
              <Button type="submit" className="w-full" onClick={() => setDialogOpen(false)}>
                {t.income.addIncome}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="page-grid-2-sm">
        <Card className="metric-card">
          <p className="metric-card-label">{t.income.expectedMonthly}</p>
          <p className="metric-card-value-3xl text-positive">{monthlyTotal} {"€"}</p>
          <p className="metric-card-note metric-card-note-mt">
            {incomes.filter((i) => i.isActive).length} {t.common.sources}
          </p>
        </Card>
        <Card className="metric-card">
          <div className="page-header-row">
            <div>
              <p className="metric-card-label">{t.income.guaranteedRecurring}</p>
              <p className="metric-card-value-3xl">{recurringTotal} {"€"}</p>
              <p className="metric-card-note metric-card-note-mt">{t.income.reliableMonthlyIncome}</p>
            </div>
            <TrendingUp className="metric-card-icon-standalone text-positive" />
          </div>
        </Card>
      </div>

      <Card className="list-card list-card-divider">
        {incomes
          .sort((a, b) => a.expectedDay - b.expectedDay)
          .map((income) => (
            <div key={income.id} className="list-item">
              <div className="list-item-icon" data-color="positive">
                <Wallet />
              </div>
              <div className="list-item-body">
                <div className="list-item-name-row">
                  <p className={`list-item-name ${!income.isActive ? "is-inactive" : ""}`}>{income.name}</p>
                  {income.isRecurring && <Badge variant="secondary">{t.income.recurring}</Badge>}
                </div>
                <p className="list-item-meta">
                  {t.income.expectedAround} {income.expectedDay}.
                </p>
              </div>
              <div className="list-item-actions">
                <p className="list-item-amount-value" data-positive>+ {income.amount} {"€"}</p>
                <Switch checked={income.isActive} onCheckedChange={() => toggleIncome(income.id)} />
              </div>
            </div>
          ))}
      </Card>
    </div>
  );
}
