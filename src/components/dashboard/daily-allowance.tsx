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
  monthIncome?: number;
  monthExpenses?: number;
  trendPercent?: number;
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
  monthIncome = 0,
  monthExpenses = 0,
  trendPercent = 0,
  currency = "€",
}: DailyAllowanceProps) {
  const { t, locale } = useLocale();
  const effectiveBudget = todaySpentAll > 0 ? Math.max(0, todayRemaining) : dailyBudget;
  const overspent = todayRemaining < 0;
  const status =
    effectiveBudget > 50 ? "good" : effectiveBudget > 20 ? "tight" : "danger";

  return (
    <div className="daily-allowance-grid">
      <Card className="daily-allowance-hero" data-status={status}>
        <div className="daily-allowance-hero-content">
          <p className="daily-allowance-hero-label">
            {todaySpentAll > 0
              ? (locale === "fi" ? "Tänään jäljellä" : "Remaining today")
              : t.dashboard.dailyBudget}
          </p>
          <div className="daily-allowance-hero-amount">
            <span className="daily-allowance-hero-value" data-status={overspent ? "danger" : status}>
              {overspent ? "0.00" : effectiveBudget.toFixed(2)} {currency}
            </span>
            <span className="daily-allowance-hero-unit">{todaySpentAll > 0 ? "" : t.dashboard.perDay}</span>
          </div>
          <p className="daily-allowance-hero-note">
            {overspent ? (
              <>
                {locale === "fi" ? "Ylitetty " : "Exceeded by "}
                <span className="text-negative">{Math.abs(todayRemaining).toFixed(2)} {currency}</span>
                {locale === "fi" ? " verran. Alkuperäinen päiväbudjetti oli " : ". Original daily budget was "}
                <span className={status === "good" ? "text-positive" : status === "tight" ? "text-chart-3" : "text-negative"}>{dailyBudget.toFixed(2)} {currency}</span>
                {locale === "fi" ? ", käytetty " : ", spent "}
                <span className="text-negative">{todaySpentAll.toFixed(2)} {currency}</span>
                {daysUntilIncome > 0 && (
                  <>
                    {". "}
                    {locale === "fi" ? "Huomiselle käytössä on " : "Available tomorrow "}
                    <span className="text-positive">{Math.max(0, dailyBudget + todayRemaining / Math.max(1, daysUntilIncome)).toFixed(2)} {currency}</span>
                  </>
                )}
                {"."}
              </>
            ) : todaySpentAll > 0 ? (
              <>
                {locale === "fi" ? "Päiväbudjetti " : "Budget "}
                <span className={status === "good" ? "text-positive" : status === "tight" ? "text-chart-3" : "text-negative"}>{dailyBudget.toFixed(2)} {currency}</span>
                {" \u00B7 "}
                {locale === "fi" ? "käytetty " : "spent "}
                <span className="text-negative">{todaySpentAll.toFixed(2)} {currency}</span>
              </>
            ) : (
              `${daysUntilIncome} ${t.dashboard.daysUntilNextIncome}`
            )}
            {!overspent && status === "danger" && ` \u2014 ${t.dashboard.cutNonEssentials}`}
            {!overspent && status === "tight" && ` \u2014 ${t.dashboard.beCareful}`}
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
          <div className="metric-card-icon" data-color={projectedMonthEnd >= 0 ? "positive" : "negative"}>
            <CalendarClock />
          </div>
          <div>
            <p className="metric-card-label">{locale === "fi" ? "Kuun lopussa (arvio)" : "End of month (est.)"}</p>
            <p className="metric-card-value">
              <span className={projectedMonthEnd >= 0 ? "text-positive" : "text-negative"}>
                {projectedMonthEnd.toFixed(2)} {currency}
              </span>
            </p>
            <p className="metric-card-note">
              {burnRate.toFixed(0)} {currency}/{locale === "fi" ? "pv" : "day"}
              {trendPercent !== 0 && (
                <>
                  {" \u00B7 "}
                  <span className={trendPercent > 0 ? "text-negative" : "text-positive"}>
                    {trendPercent > 0 ? "+" : ""}{trendPercent}%
                  </span>
                  {" "}{locale === "fi" ? "vs ed. viikko" : "vs last week"}
                </>
              )}
            </p>
          </div>
        </div>
      </Card>

      {monthIncome > 0 && (
        <Card className="metric-card metric-card-half">
          <div className="metric-card-row">
            <div className="metric-card-icon" data-color={monthIncome - monthExpenses >= 0 ? "positive" : "negative"}>
              {monthIncome - monthExpenses >= 0 ? <ArrowDown /> : <ArrowUp />}
            </div>
            <div>
              <p className="metric-card-label">{locale === "fi" ? "Kuukauden tilanne" : "Month status"}</p>
              <p className="metric-card-value">
                <span className={monthIncome - monthExpenses >= 0 ? "text-positive" : "text-negative"}>
                  {monthIncome - monthExpenses >= 0 ? "+" : "\u2212"}{Math.abs(monthIncome - monthExpenses).toFixed(2)} {currency}
                </span>
              </p>
              <p className="metric-card-note">
                {monthIncome - monthExpenses >= 0
                  ? (locale === "fi" ? "Plussalla" : "Surplus")
                  : (locale === "fi" ? "Miinuksella" : "Deficit")}
                {` \u00B7 ${locale === "fi" ? "tulot" : "income"} ${monthIncome.toFixed(0)} ${currency} \u2013 ${locale === "fi" ? "menot (arvio)" : "expenses (est.)"} ${monthExpenses.toFixed(0)} ${currency}`}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
