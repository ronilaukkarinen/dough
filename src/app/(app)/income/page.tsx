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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t.income.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Track when money comes in
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" className="gap-2" />}>
            <Plus className="h-4 w-4" />
            Add income
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add income source</DialogTitle>
            </DialogHeader>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="e.g. Salary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (€)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Expected day</Label>
                  <Input type="number" min="1" max="31" placeholder="1" />
                </div>
              </div>
              <div className="flex items-center gap-2">
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50 bg-card/80 p-6">
          <p className="text-xs font-medium text-muted-foreground">Expected monthly</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-positive">
            {monthlyTotal} €
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {incomes.filter((i) => i.isActive).length} sources
          </p>
        </Card>
        <Card className="border-border/50 bg-card/80 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Guaranteed recurring</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                {recurringTotal} €
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Reliable monthly income
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-positive" />
          </div>
        </Card>
      </div>

      {/* Income list */}
      <Card className="border-border/50 bg-card/80 divide-y divide-border/50">
        {incomes
          .sort((a, b) => a.expectedDay - b.expectedDay)
          .map((income) => (
            <div
              key={income.id}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-positive/10">
                <Wallet className="h-5 w-5 text-positive" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${income.isActive ? "text-foreground" : "text-muted-foreground line-through"}`}>
                    {income.name}
                  </p>
                  {income.isRecurring && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Recurring
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Expected around {income.expectedDay}th
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold tabular-nums text-positive">
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
