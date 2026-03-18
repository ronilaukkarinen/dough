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

const demoIncome: Income[] = [
  { id: "1", name: "Dude Oy — Salary", amount: 2800, expectedDay: 15, isRecurring: true, isActive: true },
  { id: "2", name: "Wife's Salary", amount: 1400, expectedDay: 25, isRecurring: true, isActive: true },
  { id: "3", name: "Freelance", amount: 500, expectedDay: 10, isRecurring: false, isActive: true },
];

export default function IncomePage() {
  const { t } = useLocale();
  const [incomes, setIncomes] = useState<Income[]>(demoIncome);
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
          <p className="page-subtitle">Track when money comes in</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="icon-sm" />
            Add income
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add income source</DialogTitle>
            </DialogHeader>
            <form className="form-stack">
              <div className="form-field">
                <Label>Name</Label>
                <Input placeholder="e.g. Salary" />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>Amount (€)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="form-field">
                  <Label>Expected day</Label>
                  <Input type="number" min="1" max="31" placeholder="1" />
                </div>
              </div>
              <div className="form-row">
                <Switch id="recurring" />
                <Label htmlFor="recurring">Recurring monthly</Label>
              </div>
              <Button type="submit" className="w-full" onClick={() => setDialogOpen(false)}>
                Add income
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="page-grid-2-sm">
        <Card className="metric-card">
          <p className="metric-card-label">Expected monthly</p>
          <p className="metric-card-value text-positive" style={{ fontSize: "1.875rem", lineHeight: "2.25rem", marginTop: "0.25rem" }}>
            {monthlyTotal} €
          </p>
          <p className="metric-card-note" style={{ marginTop: "0.25rem" }}>
            {incomes.filter((i) => i.isActive).length} sources
          </p>
        </Card>
        <Card className="metric-card">
          <div className="page-header-row">
            <div>
              <p className="metric-card-label">Guaranteed recurring</p>
              <p className="metric-card-value" style={{ fontSize: "1.875rem", lineHeight: "2.25rem", marginTop: "0.25rem" }}>
                {recurringTotal} €
              </p>
              <p className="metric-card-note" style={{ marginTop: "0.25rem" }}>
                Reliable monthly income
              </p>
            </div>
            <TrendingUp style={{ width: "1.25rem", height: "1.25rem", color: "var(--positive)" }} />
          </div>
        </Card>
      </div>

      {/* Income list */}
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
                  <p className={`list-item-name ${!income.isActive ? "is-inactive" : ""}`}>
                    {income.name}
                  </p>
                  {income.isRecurring && (
                    <Badge variant="secondary">Recurring</Badge>
                  )}
                </div>
                <p className="list-item-meta">
                  Expected around {income.expectedDay}th
                </p>
              </div>
              <div className="list-item-actions">
                <p className="list-item-amount-value" data-positive>
                  + {income.amount} €
                </p>
                <Switch
                  checked={income.isActive}
                  onCheckedChange={() => toggleIncome(income.id)}
                />
              </div>
            </div>
          ))}
      </Card>
    </div>
  );
}
