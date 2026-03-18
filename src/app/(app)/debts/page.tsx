"use client";

import { useState } from "react";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Debts
          </h1>
          <p className="text-sm text-muted-foreground">
            Track and eliminate your debts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" className="gap-2" />}>
            <Plus className="h-4 w-4" />
            Add debt
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add debt</DialogTitle>
            </DialogHeader>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="e.g. Car Loan" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total amount (€)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Remaining (€)</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Interest rate (%)</Label>
                  <Input type="number" step="0.1" placeholder="0.0" />
                </div>
                <div className="space-y-2">
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 bg-card/80 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-negative/10">
              <TrendingDown className="h-5 w-5 text-negative" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total debt</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {totalDebt} €
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-border/50 bg-card/80 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-positive/10">
              <Target className="h-5 w-5 text-positive" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {progress.toFixed(0)}%
              </p>
            </div>
          </div>
          <Progress value={progress} className="mt-3 h-2" />
        </Card>
        <Card className="border-border/50 bg-card/80 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
              <Calendar className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Debt-free in</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {snowball.months} months
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Debt list */}
      <Card className="border-border/50 bg-card/80 divide-y divide-border/50">
        {debts.map((debt) => {
          const pct = ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100;
          return (
            <div key={debt.id} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{debt.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {debt.interestRate}% APR · {debt.minimumPayment} €/mo min
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {debt.remainingAmount} €
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    of {debt.totalAmount} €
                  </p>
                </div>
              </div>
              <Progress value={pct} className="mt-3 h-1.5" />
            </div>
          );
        })}
      </Card>

      {/* Payoff strategy */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">Payoff strategy</h2>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Extra monthly:</Label>
            <Input
              type="number"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Number(e.target.value))}
              className="h-8 w-24 text-sm"
            />
          </div>
        </div>

        <Tabs defaultValue="snowball">
          <TabsList>
            <TabsTrigger value="snowball" className="gap-1.5">
              <Flame className="h-3.5 w-3.5" />
              Snowball
            </TabsTrigger>
            <TabsTrigger value="avalanche" className="gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" />
              Avalanche
            </TabsTrigger>
          </TabsList>

          {[
            { key: "snowball", data: snowball, desc: "Pay smallest debts first for quick wins" },
            { key: "avalanche", data: avalanche, desc: "Pay highest interest first to save money" },
          ].map(({ key, data, desc }) => (
            <TabsContent key={key} value={key}>
              <Card className="border-border/50 bg-card/80 p-6">
                <p className="text-sm text-muted-foreground mb-4">{desc}</p>
                <div className="mb-4 flex gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Debt-free: </span>
                    <span className="font-semibold text-foreground">{data.months} months</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total interest: </span>
                    <span className="font-semibold text-negative">{data.totalInterest} €</span>
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
                            <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-lg">
                              <p className="text-xs text-muted-foreground">{label}</p>
                              <p className="text-sm font-medium text-foreground">{payload[0].value} €</p>
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
