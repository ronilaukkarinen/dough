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
import {
  Plus,
  CalendarClock,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  isActive: boolean;
}

const demoBills: Bill[] = [
  { id: "1", name: "Rent", amount: 850, dueDay: 1, category: "Housing", isActive: true },
  { id: "2", name: "Electricity (Helen)", amount: 89, dueDay: 12, category: "Utilities", isActive: true },
  { id: "3", name: "Phone (Elisa)", amount: 30, dueDay: 15, category: "Utilities", isActive: true },
  { id: "4", name: "Insurance", amount: 120, dueDay: 20, category: "Insurance", isActive: true },
  { id: "5", name: "Car Loan", amount: 270, dueDay: 28, category: "Debt", isActive: true },
  { id: "6", name: "Netflix", amount: 17.99, dueDay: 17, category: "Subscriptions", isActive: true },
  { id: "7", name: "Spotify", amount: 10.99, dueDay: 14, category: "Subscriptions", isActive: true },
  { id: "8", name: "YouTube Premium", amount: 11.99, dueDay: 5, category: "Subscriptions", isActive: true },
  { id: "9", name: "iCloud+", amount: 2.99, dueDay: 8, category: "Subscriptions", isActive: true },
  { id: "10", name: "Tax Debt Payment", amount: 150, dueDay: 25, category: "Tax", isActive: true },
];

export default function BillsPage() {
  const { t } = useLocale();
  const [bills, setBills] = useState<Bill[]>(demoBills);
  const [dialogOpen, setDialogOpen] = useState(false);

  const today = new Date().getDate();
  const monthlyTotal = bills.filter((b) => b.isActive).reduce((s, b) => s + b.amount, 0);
  const remainingThisMonth = bills
    .filter((b) => b.isActive && b.dueDay >= today)
    .reduce((s, b) => s + b.amount, 0);

  const toggleBill = (id: string) => {
    setBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t.bills.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your monthly obligations
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" className="gap-2" />}>
            <Plus className="h-4 w-4" />
            Add bill
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add recurring bill</DialogTitle>
            </DialogHeader>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="e.g. Netflix" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (€)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Due day</Label>
                  <Input type="number" min="1" max="31" placeholder="1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input placeholder="e.g. Subscriptions" />
              </div>
              <Button type="submit" className="w-full" onClick={() => setDialogOpen(false)}>
                Add bill
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50 bg-card/80 p-6">
          <p className="text-xs font-medium text-muted-foreground">Monthly total</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            {monthlyTotal.toFixed(2)} €
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {bills.filter((b) => b.isActive).length} active bills
          </p>
        </Card>
        <Card className="border-border/50 bg-card/80 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Remaining this month</p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-negative">
                {remainingThisMonth.toFixed(2)} €
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Still due before month end
              </p>
            </div>
            <AlertCircle className="h-5 w-5 text-negative" />
          </div>
        </Card>
      </div>

      {/* Bills list */}
      <Card className="border-border/50 bg-card/80 divide-y divide-border/50">
        {bills
          .sort((a, b) => a.dueDay - b.dueDay)
          .map((bill) => (
            <div
              key={bill.id}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-4/10">
                <CalendarClock className="h-5 w-5 text-chart-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${bill.isActive ? "text-foreground" : "text-muted-foreground line-through"}`}>
                    {bill.name}
                  </p>
                  {bill.dueDay >= today && bill.dueDay <= today + 3 && bill.isActive && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Due soon
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {bill.category} · Due on {bill.dueDay}th
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {bill.amount.toFixed(2)} €
                </p>
                <Switch
                  checked={bill.isActive}
                  onCheckedChange={() => toggleBill(bill.id)}
                />
              </div>
            </div>
          ))}
      </Card>
    </div>
  );
}
