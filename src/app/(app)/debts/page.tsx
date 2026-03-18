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

// TODO: Load from database

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
  const [debts] = useState<Debt[]>([]);
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
          <p className="page-subtitle">{t.debts.subtitle}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="icon-sm" />
            {t.debts.addDebt}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.debts.addDebt}</DialogTitle>
            </DialogHeader>
            <form className="form-stack">
              <div className="form-field">
                <Label>{t.debts.name}</Label>
                <Input placeholder={t.debts.namePlaceholder} />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>{t.debts.totalAmountEur}</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="form-field">
                  <Label>{t.debts.remainingEur}</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>{t.debts.interestRatePercent}</Label>
                  <Input type="number" step="0.1" placeholder="0.0" />
                </div>
                <div className="form-field">
                  <Label>{t.debts.minPaymentEur}</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <Button type="submit" className="w-full" onClick={() => setDialogOpen(false)}>
                {t.debts.addDebt}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="page-grid-3-sm">
        <Card className="metric-card">
          <div className="metric-card-row">
            <div className="metric-card-icon" data-color="negative">
              <TrendingDown />
            </div>
            <div>
              <p className="metric-card-label">{t.debts.totalDebt}</p>
              <p className="metric-card-value">{totalDebt} {"\u20AC"}</p>
            </div>
          </div>
        </Card>
        <Card className="metric-card">
          <div className="metric-card-row">
            <div className="metric-card-icon" data-color="positive">
              <Target />
            </div>
            <div>
              <p className="metric-card-label">{t.debts.progress}</p>
              <p className="metric-card-value">{progress.toFixed(0)}%</p>
            </div>
          </div>
          <Progress value={progress} className="progress-thick" />
        </Card>
        <Card className="metric-card">
          <div className="metric-card-row">
            <div className="metric-card-icon" data-color="chart-3">
              <Calendar />
            </div>
            <div>
              <p className="metric-card-label">{t.debts.debtFreeIn}</p>
              <p className="metric-card-value">{snowball.months} {t.debts.months}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="list-card list-card-divider">
        {debts.map((debt) => {
          const pct = ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100;
          return (
            <div key={debt.id} className="debt-item">
              <div className="debt-item-header">
                <div>
                  <p className="debt-item-name">{debt.name}</p>
                  <p className="debt-item-meta">
                    {debt.interestRate}% {t.debts.apr} · {debt.minimumPayment} {"\u20AC"}{t.debts.moMin}
                  </p>
                </div>
                <div className="debt-item-right">
                  <p className="debt-item-amount">{debt.remainingAmount} {"\u20AC"}</p>
                  <p className="debt-item-total">{t.common.of} {debt.totalAmount} {"\u20AC"}</p>
                </div>
              </div>
              <Progress value={pct} className="progress-thin" />
            </div>
          );
        })}
      </Card>

      <div className="form-stack">
        <div className="payoff-header">
          <h2 className="payoff-title">{t.debts.payoffStrategy}</h2>
          <div className="form-row">
            <Label className="payoff-extra-label">{t.debts.extraMonthly}</Label>
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
              <Flame className="tabs-trigger-icon" />
              {t.debts.snowball}
            </TabsTrigger>
            <TabsTrigger value="avalanche">
              <TrendingDown className="tabs-trigger-icon" />
              {t.debts.avalanche}
            </TabsTrigger>
          </TabsList>

          {[
            { key: "snowball", data: snowball, desc: t.debts.snowballDesc },
            { key: "avalanche", data: avalanche, desc: t.debts.avalancheDesc },
          ].map(({ key, data, desc }) => (
            <TabsContent key={key} value={key}>
              <Card className="metric-card">
                <p className="payoff-desc">{desc}</p>
                <div className="payoff-stats">
                  <div>
                    <span className="payoff-stats-label">{t.debts.debtFree} </span>
                    <span className="payoff-stats-value">{data.months} {t.debts.months}</span>
                  </div>
                  <div>
                    <span className="payoff-stats-label">{t.debts.totalInterest} </span>
                    <span className="payoff-stats-value" data-color="negative">{data.totalInterest} {"\u20AC"}</span>
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
                      <YAxis tick={{ fill: "#7a8ba0", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k \u20AC`} />
                      <Tooltip
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <div className="chart-tooltip">
                              <p className="chart-tooltip-label">{label}</p>
                              <p className="chart-tooltip-value text-foreground">{payload[0].value} {"\u20AC"}</p>
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
