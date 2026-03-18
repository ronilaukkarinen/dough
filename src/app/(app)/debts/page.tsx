"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  TrendingDown,
  Target,
  Calendar,
  Flame,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";

interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number;
  minimumPayment: number;
}

const demoDebts: Debt[] = [
  { id: "1", name: "Car Loan", totalAmount: 12000, remainingAmount: 8400, interestRate: 4.5, minimumPayment: 270 },
  { id: "2", name: "Tax Debt", totalAmount: 3500, remainingAmount: 2800, interestRate: 7, minimumPayment: 150 },
  { id: "3", name: "Credit Card", totalAmount: 2000, remainingAmount: 1200, interestRate: 18.5, minimumPayment: 50 },
];

function calculateSnowball(debts: Debt[], extraPayment: number = 0) {
  const sorted = [...debts].sort((a, b) => a.remainingAmount - b.remainingAmount);
  return calculatePayoff(sorted, extraPayment);
}

function calculateAvalanche(debts: Debt[], extraPayment: number = 0) {
  const sorted = [...debts].sort((a, b) => b.interestRate - a.interestRate);
  return calculatePayoff(sorted, extraPayment);
}

function calculatePayoff(sortedDebts: Debt[], extraPayment: number) {
  const balances = sortedDebts.map((d) => d.remainingAmount);
  const rates = sortedDebts.map((d) => d.interestRate / 100 / 12);
  const minPayments = sortedDebts.map((d) => d.minimumPayment);
  const timeline: { month: string; total: number }[] = [];

  let month = 0;
  let totalInterest = 0;

  while (balances.some((b) => b > 0) && month < 120) {
    let extra = extraPayment;
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0) {
        extra += minPayments[i];
        continue;
      }
      const interest = balances[i] * rates[i];
      totalInterest += interest;
      let payment = minPayments[i] + (i === balances.findIndex((b) => b > 0) ? extra : 0);
      payment = Math.min(payment, balances[i] + interest);
      balances[i] = balances[i] + interest - payment;
      if (balances[i] < 1) balances[i] = 0;
    }

    const date = new Date();
    date.setMonth(date.getMonth() + month);
    timeline.push({
      month: date.toLocaleDateString("en", { month: "short", year: "2-digit" }),
      total: Math.round(balances.reduce((s, b) => s + b, 0)),
    });
    month++;
  }

  return { timeline, months: month, totalInterest: Math.round(totalInterest) };
}

export default function DebtsPage() {
  const { t } = useLocale();
  const [debts] = useState<Debt[]>(demoDebts);
  const [extraPayment, setExtraPayment] = useState(50);
  const [dialogOpen, setDialogOpen] = useState(false);

  const totalDebt = debts.reduce((s, d) => s + d.remainingAmount, 0);
  const totalOriginal = debts.reduce((s, d) => s + d.totalAmount, 0);
  const totalPaid = totalOriginal - totalDebt;
  const progress = (totalPaid / totalOriginal) * 100;

  const snowball = calculateSnowball(debts, extraPayment);
  const avalanche = calculateAvalanche(debts, extraPayment);

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">{t.debts.title}</h1>
          <p className="page-subtitle">Track and eliminate your debts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="icon-sm" />
            Add debt
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add debt</DialogTitle>
            </DialogHeader>
            <form className="form-stack">
              <div className="form-field">
                <Label>Name</Label>
                <Input placeholder="e.g. Car Loan" />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>Total amount (€)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="form-field">
                  <Label>Remaining (€)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>Interest rate (%)</Label>
                  <Input type="number" step="0.1" placeholder="0.0" />
                </div>
                <div className="form-field">
                  <Label>Min. payment (€)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <Button type="submit" className="w-full" onClick={() => setDialogOpen(false)}>
                Add debt
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="page-grid-3-sm">
        <Card className="metric-card">
          <div className="metric-card-row">
            <div className="metric-card-icon" data-color="negative">
              <TrendingDown />
            </div>
            <div>
              <p className="metric-card-label">Total debt</p>
              <p className="metric-card-value">{totalDebt} €</p>
            </div>
          </div>
        </Card>
        <Card className="metric-card">
          <div className="metric-card-row">
            <div className="metric-card-icon" data-color="positive">
              <Target />
            </div>
            <div>
              <p className="metric-card-label">Progress</p>
              <p className="metric-card-value">{progress.toFixed(0)}%</p>
            </div>
          </div>
          <Progress value={progress} style={{ marginTop: "0.75rem", height: "0.5rem" }} />
        </Card>
        <Card className="metric-card">
          <div className="metric-card-row">
            <div className="metric-card-icon" data-color="chart-3">
              <Calendar />
            </div>
            <div>
              <p className="metric-card-label">Debt-free in</p>
              <p className="metric-card-value">{snowball.months} months</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Debt list */}
      <Card className="list-card list-card-divider">
        {debts.map((debt) => {
          const pct = ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100;
          return (
            <div key={debt.id} className="debt-item">
              <div className="debt-item-header">
                <div>
                  <p className="debt-item-name">{debt.name}</p>
                  <p className="debt-item-meta">
                    {debt.interestRate}% APR · {debt.minimumPayment} €/mo min
                  </p>
                </div>
                <div className="debt-item-right">
                  <p className="debt-item-amount">{debt.remainingAmount} €</p>
                  <p className="debt-item-total">of {debt.totalAmount} €</p>
                </div>
              </div>
              <Progress value={pct} style={{ marginTop: "0.75rem", height: "0.375rem" }} />
            </div>
          );
        })}
      </Card>

      {/* Payoff strategy */}
      <div className="form-stack">
        <div className="payoff-header">
          <h2 className="payoff-title">Payoff strategy</h2>
          <div className="form-row">
            <Label className="payoff-extra-label">Extra monthly:</Label>
            <Input
              type="number"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Number(e.target.value))}
              className="payoff-extra-input"
            />
          </div>
        </div>

        <Tabs defaultValue="snowball">
          <TabsList>
            <TabsTrigger value="snowball">
              <Flame style={{ width: "0.875rem", height: "0.875rem" }} />
              Snowball
            </TabsTrigger>
            <TabsTrigger value="avalanche">
              <TrendingDown style={{ width: "0.875rem", height: "0.875rem" }} />
              Avalanche
            </TabsTrigger>
          </TabsList>

          {[
            { key: "snowball", data: snowball, desc: "Pay smallest debts first for quick wins" },
            { key: "avalanche", data: avalanche, desc: "Pay highest interest first to save money" },
          ].map(({ key, data, desc }) => (
            <TabsContent key={key} value={key}>
              <Card className="metric-card">
                <p className="payoff-desc">{desc}</p>
                <div className="payoff-stats">
                  <div>
                    <span className="payoff-stats-label">Debt-free: </span>
                    <span className="payoff-stats-value">{data.months} months</span>
                  </div>
                  <div>
                    <span className="payoff-stats-label">Total interest: </span>
                    <span className="payoff-stats-value" data-color="negative">{data.totalInterest} €</span>
                  </div>
                </div>
                <ChartContainer height={250}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`${key}Grad`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff6b6b" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#ff6b6b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: "#7a8ba0", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fill: "#7a8ba0", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k €`} />
                      <Tooltip
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <div className="chart-tooltip">
                              <p className="chart-tooltip-label">{label}</p>
                              <p className="chart-tooltip-value text-foreground">{payload[0].value} €</p>
                            </div>
                          ) : null
                        }
                      />
                      <Area type="monotone" dataKey="total" stroke="#ff6b6b" strokeWidth={2} fill={`url(#${key}Grad)`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
