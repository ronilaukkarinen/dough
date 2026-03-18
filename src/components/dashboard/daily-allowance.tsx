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
  currency?: string;
}

export function DailyAllowance({
  dailyBudget,
  availableBalance,
  upcomingBills,
  nextIncomeAmount,
  nextIncomeDate,
  daysUntilIncome,
  currency = "€",
}: DailyAllowanceProps) {
  const { t } = useLocale();
  const status =
    dailyBudget > 50 ? "good" : dailyBudget > 20 ? "tight" : "danger";

  return (
    <div className="daily-allowance-grid">
      <Card className="daily-allowance-hero" data-status={status}>
        <div className="daily-allowance-hero-content">
          <p className="daily-allowance-hero-label">{t.dashboard.dailyBudget}</p>
          <div className="daily-allowance-hero-amount">
            <span className="daily-allowance-hero-value" data-status={status}>
              {dailyBudget.toFixed(0)} {currency}
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
          <div className="metric-card-icon" data-color="primary">
            <Wallet />
          </div>
          <div>
            <p className="metric-card-label">{t.dashboard.available}</p>
            <p className="metric-card-value">{availableBalance} {currency}</p>
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
            <p className="metric-card-value">{upcomingBills} {currency}</p>
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
            <p className="metric-card-value">{nextIncomeAmount} {currency}</p>
            <p className="metric-card-note">{nextIncomeDate}</p>
          </div>
        </div>
      </Card>

      <Card className="metric-card metric-card-half">
        <div className="metric-card-row">
          <div className="metric-card-icon" data-color="chart-4">
            <CalendarClock />
          </div>
          <div>
            <p className="metric-card-label">{t.dashboard.cashFlowForecast}</p>
            <p className="metric-card-value">
              {availableBalance - upcomingBills + nextIncomeAmount} {currency}
            </p>
            <p className="metric-card-note">{t.dashboard.endOfMonthEstimate}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
