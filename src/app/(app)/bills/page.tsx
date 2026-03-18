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
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">{t.bills.title}</h1>
          <p className="page-subtitle">Manage your monthly obligations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="icon-sm" />
            Add bill
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add recurring bill</DialogTitle>
            </DialogHeader>
            <form className="form-stack">
              <div className="form-field">
                <Label>Name</Label>
                <Input placeholder="e.g. Netflix" />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>Amount (€)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="form-field">
                  <Label>Due day</Label>
                  <Input type="number" min="1" max="31" placeholder="1" />
                </div>
              </div>
              <div className="form-field">
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
      <div className="page-grid-2-sm">
        <Card className="metric-card">
          <p className="metric-card-label">Monthly total</p>
          <p className="metric-card-value-3xl">
            {monthlyTotal.toFixed(2)} €
          </p>
          <p className="metric-card-note metric-card-note-mt">
            {bills.filter((b) => b.isActive).length} active bills
          </p>
        </Card>
        <Card className="metric-card">
          <div className="page-header-row">
            <div>
              <p className="metric-card-label">Remaining this month</p>
              <p className="metric-card-value-3xl text-negative">
                {remainingThisMonth.toFixed(2)} €
              </p>
              <p className="metric-card-note metric-card-note-mt">
                Still due before month end
              </p>
            </div>
            <AlertCircle className="metric-card-icon-standalone text-negative" />
          </div>
        </Card>
      </div>

      {/* Bills list */}
      <Card className="list-card list-card-divider">
        {bills
          .sort((a, b) => a.dueDay - b.dueDay)
          .map((bill) => (
            <div key={bill.id} className="list-item">
              <div className="list-item-icon" data-color="chart-4">
                <CalendarClock />
              </div>
              <div className="list-item-body">
                <div className="list-item-name-row">
                  <p className={`list-item-name ${!bill.isActive ? "is-inactive" : ""}`}>
                    {bill.name}
                  </p>
                  {bill.dueDay >= today && bill.dueDay <= today + 3 && bill.isActive && (
                    <Badge variant="destructive">Due soon</Badge>
                  )}
                </div>
                <p className="list-item-meta">
                  {bill.category} · Due on {bill.dueDay}th
                </p>
              </div>
              <div className="list-item-actions">
                <p className="list-item-amount-value">
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
