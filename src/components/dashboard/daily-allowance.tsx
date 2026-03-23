"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp, CalendarClock, Wallet, Info } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { F } from "@/components/ui/f";

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
  billsDelayNeeded?: boolean;
  budgetIfDelayed?: number;
  budgetBreakdown?: {
    startDay: number;
    endDay: number;
    days: number;
    balanceAtStart: number;
    incomeAtStart: number;
    obligations: number;
    savingGoalDeducted: number;
    pool: number;
  } | null;
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
  billsDelayNeeded = false,
  budgetIfDelayed = 0,
  budgetBreakdown,
  currency = "€",
}: DailyAllowanceProps) {
  const { t, locale, fmt, mask } = useLocale();
  const [infoOpen, setInfoOpen] = useState(false);
  const [budgetInfoOpen, setBudgetInfoOpen] = useState(false);
  const effectiveBudget = todaySpentAll > 0 ? Math.max(0, todayRemaining) : dailyBudget;
  const overspent = todayRemaining < 0;
  const budgetZero = dailyBudget === 0;
  const status =
    effectiveBudget > 50 ? "good" : effectiveBudget > 20 ? "tight" : "danger";

  return (
    <div className="daily-allowance-grid">
      <Card className="daily-allowance-hero" data-status={status}>
        <div className="daily-allowance-hero-content">
          <p className="daily-allowance-hero-label metric-card-label-info">
            {todaySpentAll > 0
              ? (locale === "fi" ? "Tänään jäljellä" : "Remaining today")
              : t.dashboard.dailyBudget}
            <span className={`metric-info-wrap ${budgetInfoOpen ? "is-open" : ""}`}>
              <button type="button" className="metric-info-trigger" onClick={() => setBudgetInfoOpen((v) => !v)}>
                <Info />
              </button>
              <span className="metric-info-popup">
                {budgetBreakdown ? (locale === "fi"
                  ? `Tiukin jakso: pv ${budgetBreakdown.startDay + 1}\u2013${budgetBreakdown.endDay} (${budgetBreakdown.days} pv). Saldo ${fmt(budgetBreakdown.balanceAtStart)} €${budgetBreakdown.incomeAtStart > 0 ? ` + tulot ${fmt(budgetBreakdown.incomeAtStart)} €` : ""}${budgetBreakdown.obligations > 0 ? ` \u2212 laskut/velat ${fmt(budgetBreakdown.obligations)} €` : ""}${budgetBreakdown.savingGoalDeducted > 0 ? ` \u2212 säästötavoite ${fmt(budgetBreakdown.savingGoalDeducted)} €` : ""} = ${fmt(budgetBreakdown.pool)} € \u00F7 ${budgetBreakdown.days} pv = ${fmt(dailyBudget)} €/pv`
                  : `Tightest segment: day ${budgetBreakdown.startDay + 1}\u2013${budgetBreakdown.endDay} (${budgetBreakdown.days}d). Balance ${fmt(budgetBreakdown.balanceAtStart)} €${budgetBreakdown.incomeAtStart > 0 ? ` + income ${fmt(budgetBreakdown.incomeAtStart)} €` : ""}${budgetBreakdown.obligations > 0 ? ` \u2212 bills/debts ${fmt(budgetBreakdown.obligations)} €` : ""}${budgetBreakdown.savingGoalDeducted > 0 ? ` \u2212 saving goal ${fmt(budgetBreakdown.savingGoalDeducted)} €` : ""} = ${fmt(budgetBreakdown.pool)} € \u00F7 ${budgetBreakdown.days}d = ${fmt(dailyBudget)} €/day`
                ) : (locale === "fi" ? "Päiväbudjetti lasketaan jakamalla käytettävissä oleva raha tulojen välisiin jaksoihin" : "Daily budget calculated by splitting available money between income segments")}
              </span>
            </span>
          </p>
          <div className="daily-allowance-hero-amount">
            <span className="daily-allowance-hero-value" data-status={overspent ? "danger" : status}>
              <F v={overspent ? 0 : effectiveBudget} s={` ${currency}`} />
            </span>
            <span className="daily-allowance-hero-unit">{todaySpentAll > 0 ? "" : t.dashboard.perDay}</span>
          </div>
          <p className="daily-allowance-hero-note">
            {budgetZero && billsDelayNeeded ? (
              <>
                {locale === "fi"
                  ? "Jos maksaisit kaikki laskut, päiväbudjettisi olisi "
                  : "If you paid all bills, your daily budget would be "}
                {(() => {
                  const afterBills = Math.round((availableBalance - upcomingBills) / Math.max(1, daysUntilIncome));
                  const cls = afterBills >= 0 ? "text-positive" : "text-negative";
                  return <span className={cls}><F v={afterBills} s={` ${currency}`} /></span>;
                })()}
                {". "}
                {locale === "fi" ? "Laskuja " : "Bills "}
                <span className="text-negative"><F v={upcomingBills} s={` ${currency}`} /></span>
                {". "}
                {daysUntilIncome > 0 && `${mask(daysUntilIncome)} ${t.dashboard.daysUntilNextIncome}.`}
              </>
            ) : overspent ? (
              <>
                {locale === "fi" ? "Ylitetty " : "Exceeded by "}
                <span className="text-negative"><F v={Math.abs(todayRemaining)} s={` ${currency}`} /></span>
                {locale === "fi" ? " verran. Päiväbudjetti " : ". Daily budget "}
                <span className={status === "good" ? "text-positive" : status === "tight" ? "text-chart-3" : "text-negative"}><F v={dailyBudget} s={` ${currency}`} /></span>
                {locale === "fi" ? ", käytetty " : ", spent "}
                <span className="text-negative"><F v={todaySpentAll} s={` ${currency}`} /></span>
                {daysUntilIncome > 0 && (
                  <>
                    {". "}
                    {locale === "fi" ? "Huomisen budjetti noin " : "Tomorrow's budget approx. "}
                    {(() => {
                      const tomorrowBudget = Math.max(0, Math.round(dailyBudget - Math.abs(todayRemaining) / daysUntilIncome));
                      const tStatus = tomorrowBudget > 50 ? "text-positive" : tomorrowBudget > 20 ? "text-chart-3" : "text-negative";
                      return <span className={tStatus}><F v={tomorrowBudget} s={` ${currency}`} /></span>;
                    })()}
                    {` \u00B7 ${mask(daysUntilIncome)} ${t.dashboard.daysUntilNextIncome}.`}
                  </>
                )}
              </>
            ) : todaySpentAll > 0 ? (
              <>
                {locale === "fi" ? "Päiväbudjetti " : "Budget "}
                <span className={status === "good" ? "text-positive" : status === "tight" ? "text-chart-3" : "text-negative"}><F v={dailyBudget} s={` ${currency}`} /></span>
                {" \u00B7 "}
                {locale === "fi" ? "käytetty " : "spent "}
                <span className="text-negative"><F v={todaySpentAll} s={` ${currency}`} /></span>
                {daysUntilIncome > 0 && ` \u00B7 ${daysUntilIncome} ${t.dashboard.daysUntilNextIncome}`}
              </>
            ) : (
              `${mask(daysUntilIncome)} ${t.dashboard.daysUntilNextIncome}`
            )}
            {!overspent && status === "danger" && ` \u2014 ${t.dashboard.cutNonEssentials}`}
            {!overspent && status === "tight" && ` \u2014 ${t.dashboard.beCareful}`}
          </p>
        </div>
        <div className="daily-allowance-hero-bg">
          <Wallet />
        </div>
      </Card>

      {monthIncome > 0 && (
        <Card className="metric-card metric-card-span2">
          <div className="metric-card-row">
            <div className="metric-card-icon" data-color={monthIncome - monthExpenses >= 0 ? "positive" : "negative"}>
              {monthIncome - monthExpenses >= 0 ? <ArrowDown /> : <ArrowUp />}
            </div>
            <div>
              <p className="metric-card-label metric-card-label-info">
                {locale === "fi" ? "Kuukauden tilanne" : "Month status"}
                <span className={`metric-info-wrap ${infoOpen ? "is-open" : ""}`}>
                  <button type="button" className="metric-info-trigger" onClick={() => setInfoOpen((v) => !v)}>
                    <Info />
                  </button>
                  <span className="metric-info-popup">
                    {locale === "fi"
                      ? "Tulot (odotetut tai saadut) miinus menot: toteutuneet kulut + maksamattomat laskut + arvioitu loppukuun kulutus + sijoitukset + velkaerät"
                      : "Income (expected or received) minus expenses: actual spending + unpaid bills + projected remaining spending + investments + debt payments"}
                  </span>
                </span>
              </p>
              <p className="metric-card-value">
                <span className={monthIncome - monthExpenses >= 0 ? "text-positive" : "text-negative"}>
                  {monthIncome - monthExpenses >= 0 ? <>+<F v={Math.abs(monthIncome - monthExpenses)} s={` ${currency}`} /></> : <>{"\u2212"}<F v={Math.abs(monthIncome - monthExpenses)} s={` ${currency}`} /></>}
                </span>
              </p>
              <p className="metric-card-note">
                {monthIncome - monthExpenses >= 0
                  ? (locale === "fi" ? "Plussalla" : "Surplus")
                  : (locale === "fi" ? "Miinuksella" : "Deficit")}
                {" \u00B7 "}{locale === "fi" ? "tulot " : "income "}<span className="text-positive"><F v={monthIncome} s={` ${currency}`} /></span>{" \u2013 "}{locale === "fi" ? "menot (arvio) " : "expenses (est.) "}<span className="text-negative"><F v={monthExpenses} s={` ${currency}`} /></span>
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="metric-card">
        <div className="metric-card-row">
          <div className="metric-card-icon" data-color="primary">
            <Wallet />
          </div>
          <div>
            <p className="metric-card-label">{t.dashboard.available}</p>
            <p className="metric-card-value"><F v={availableBalance} s={` ${currency}`} /></p>
            {accountCount > 0 && <p className="metric-card-note">{mask(accountCount)} {locale === "fi" ? "tiliä" : "accounts"}</p>}
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
            <p className="metric-card-value"><F v={upcomingBills} s={` ${currency}`} /></p>
            {billCount > 0 && <p className="metric-card-note">{mask(billCount)} {locale === "fi" ? "laskua" : "bills"}</p>}
          </div>
        </div>
      </Card>

      <Card className="metric-card">
        <div className="metric-card-row">
          <div className="metric-card-icon" data-color="positive">
            <ArrowDown />
          </div>
          <div>
            <p className="metric-card-label">{t.dashboard.nextIncome}</p>
            <p className="metric-card-value"><F v={nextIncomeAmount} s={` ${currency}`} /></p>
            <p className="metric-card-note">{mask(nextIncomeDate)}</p>
          </div>
        </div>
      </Card>

      <Card className="metric-card">
        <div className="metric-card-row">
          <div className="metric-card-icon" data-color="chart-3">
            <CalendarClock />
          </div>
          <div>
            <p className="metric-card-label">{locale === "fi" ? "Kulutusvauhti" : "Burn rate"}</p>
            <p className="metric-card-value"><F v={burnRate} s={` ${currency}/${locale === "fi" ? "pv" : "day"}`} /></p>
            <p className="metric-card-note">
              {trendPercent !== 0 ? (
                <>
                  <span className={trendPercent > 0 ? "text-negative" : "text-positive"}>
                    {trendPercent > 0 ? "+" : ""}{mask(trendPercent)}%
                  </span>
                  {" "}{locale === "fi" ? "vs ed. viikko" : "vs last week"}
                </>
              ) : (
                locale === "fi" ? "keskiarvo tässä kuussa" : "average this month"
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
