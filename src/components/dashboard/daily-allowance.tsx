"use client";

import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp, CalendarClock, Wallet } from "lucide-react";

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
  const status =
    dailyBudget > 50 ? "good" : dailyBudget > 20 ? "tight" : "danger";

  return (
    <div className="daily-allowance-grid">
      {/* Daily Budget - Hero card */}
      <Card
        className="daily-allowance-hero"
        data-status={status}
      >
        <div className="daily-allowance-hero-content">
          <p className="daily-allowance-hero-label">
            Daily budget
          </p>
          <div className="daily-allowance-hero-amount">
            <span className="daily-allowance-hero-value" data-status={status}>
              {dailyBudget.toFixed(0)} {currency}
            </span>
            <span className="daily-allowance-hero-unit">/ day</span>
          </div>
          <p className="daily-allowance-hero-note">
            {daysUntilIncome} days until next income
            {status === "danger" && " — cut non-essentials"}
            {status === "tight" && " — be careful"}
          </p>
        </div>
        <div className="daily-allowance-hero-bg">
          <Wallet />
        </div>
      </Card>

      {/* Available Balance */}
      <Card className="metric-card">
        <div className="metric-card-row">
          <div className="metric-card-icon" data-color="primary">
            <Wallet />
          </div>
          <div>
            <p className="metric-card-label">Available</p>
            <p className="metric-card-value">
              {availableBalance} {currency}
            </p>
          </div>
        </div>
      </Card>

      {/* Upcoming Bills */}
      <Card className="metric-card">
        <div className="metric-card-row">
          <div className="metric-card-icon" data-color="negative">
            <ArrowUp />
          </div>
          <div>
            <p className="metric-card-label">Bills due</p>
            <p className="metric-card-value">
              {upcomingBills} {currency}
            </p>
          </div>
        </div>
      </Card>

      {/* Next income */}
      <Card className="metric-card metric-card-half">
        <div className="metric-card-row">
          <div className="metric-card-icon" data-color="positive">
            <ArrowDown />
          </div>
          <div>
            <p className="metric-card-label">Next income</p>
            <p className="metric-card-value metric-card-value-lg">
              {nextIncomeAmount} {currency}
            </p>
            <p className="metric-card-note">{nextIncomeDate}</p>
          </div>
        </div>
      </Card>

      {/* Cash flow forecast */}
      <Card className="metric-card metric-card-half">
        <div className="metric-card-row">
          <div className="metric-card-icon" data-color="chart-4">
            <CalendarClock />
          </div>
          <div>
            <p className="metric-card-label">Cash flow forecast</p>
            <p className="metric-card-value metric-card-value-lg">
              {availableBalance - upcomingBills + nextIncomeAmount} {currency}
            </p>
            <p className="metric-card-note">End of month estimate</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
