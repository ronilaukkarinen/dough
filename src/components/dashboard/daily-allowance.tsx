"use client";

import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp, CalendarClock, Wallet } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

interface DailyAllowanceProps {
  dailyBudget: number;
  availableBalance: number;
  upcomingBills: number;
  nextIncomeAmount: number;
  nextIncomeDate: string;
  daysUntilIncome: number;
  burnRate?: number;
  projectedMonthEnd?: number;
  accountCount?: number;
  billCount?: number;
  todaySpentAll?: number;
  todayRemaining?: number;
  currency?: string;
}

export function DailyAllowance({
  dailyBudget,
  availableBalance,
  upcomingBills,
  nextIncomeAmount,
  nextIncomeDate,
  daysUntilIncome,
  burnRate = 0,
  projectedMonthEnd = 0,
  accountCount = 0,
  billCount = 0,
  todaySpentAll = 0,
  todayRemaining = 0,
  currency = "€",
}: DailyAllowanceProps) {
  const { t, locale } = useLocale();
  const status =
    dailyBudget > 50 ? "good" : dailyBudget > 20 ? "tight" : "danger";

  return (
    <div className="daily-allowance-grid">
      <Card className="daily-allowance-hero" data-status={status}>
        <div className="daily-allowance-hero-content">
          <p className="daily-allowance-hero-label">{t.dashboard.dailyBudget}</p>
          <div className="daily-allowance-hero-amount">
            <span className="daily-allowance-hero-value" data-status={status}>
              {dailyBudget.toFixed(2)} {currency}
            </span>
            <span className="daily-allowance-hero-unit">{t.dashboard.perDay}</span>
          </div>
          <p className="daily-allowance-hero-note">
            {daysUntilIncome} {t.dashboard.daysUntilNextIncome}
            {status === "danger" && ` \u2014 ${t.dashboard.cutNonEssentials}`}
            {status === "tight" && ` \u2014 ${t.dashboard.beCareful}`}
          </p>
        </div>
        <div className="daily-allowance-hero-bg">
          <Wallet />
        </div>
      </Card>

      <Card className="metric-card">
        <div className="metric-card-row">
          <div className="metric-card-icon" data-color={todayRemaining > 0 ? "positive" : "negative"}>
            <CalendarClock />
          </div>
          <div>
            <p className="metric-card-label">{locale === "fi" ? "Tänään jäljellä" : "Today remaining"}</p>
            <p className="metric-card-value" data-status={todayRemaining > dailyBudget * 0.5 ? undefined : todayRemaining > 0 ? undefined : undefined}>
              <span className={todayRemaining <= 0 ? "text-negative" : todayRemaining < dailyBudget * 0.3 ? "text-chart-3" : "text-positive"}>
                {todayRemaining.toFixed(2)} {currency}
              </span>
            </p>
            <p className="metric-card-note">{locale === "fi" ? "käytetty" : "spent"} {todaySpentAll.toFixed(2)} {currency}</p>
          </div>
        </div>
      </Card>

      <Card className="metric-card">
        <div className="metric-card-row">
          <div className="metric-card-icon" data-color="primary">
            <Wallet />
          </div>
          <div>
            <p className="metric-card-label">{t.dashboard.available}</p>
            <p className="metric-card-value">{availableBalance.toFixed(2)} {currency}</p>
            {accountCount > 0 && <p className="metric-card-note">{accountCount} {locale === "fi" ? "tiliä" : "accounts"}</p>}
          </div>
        </div>
      </Card>

      <Card className="metric-card">
        <div className="metric-card-row">
          <div className="metric-card-icon" data-color="negative">
            <ArrowUp />
          </div>
          <div>
            <p className="metric-card-label">{t.dashboard.billsDue}</p>
            <p className="metric-card-value">{upcomingBills.toFixed(2)} {currency}</p>
            {billCount > 0 && <p className="metric-card-note">{billCount} {locale === "fi" ? "laskua" : "bills"}</p>}
          </div>
        </div>
      </Card>

      <Card className="metric-card metric-card-half">
        <div className="metric-card-row">
          <div className="metric-card-icon" data-color="positive">
            <ArrowDown />
          </div>
          <div>
            <p className="metric-card-label">{t.dashboard.nextIncome}</p>
            <p className="metric-card-value">{nextIncomeAmount.toFixed(2)} {currency}</p>
            <p className="metric-card-note">{nextIncomeDate}</p>
          </div>
        </div>
      </Card>

      <Card className="metric-card metric-card-half">
        <div className="metric-card-row">
          <div className="metric-card-icon" data-color="chart-3">
            <CalendarClock />
          </div>
          <div>
            <p className="metric-card-label">{locale === "fi" ? "Kulutusvauhti" : "Burn rate"}</p>
            <p className="metric-card-value">{burnRate.toFixed(2)} {currency}/{locale === "fi" ? "pv" : "day"}</p>
            <p className="metric-card-note">
              {locale === "fi" ? "Kuun lopussa" : "End of month"}: {projectedMonthEnd.toFixed(2)} {currency}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
