"use client";

import { useLocale } from "@/lib/locale-context";
import { Card } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";

interface SavingsStreakProps {
  dailyBudget: number;
  todaySpent: number;
}

interface HistoryEntry {
  date: string;
  budget: number;
  spent: number;
}

export function SavingsStreak({ dailyBudget, todaySpent }: SavingsStreakProps) {
  const { locale, fmt } = useLocale();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const savedRef = useRef(false);
  const now = new Date();
  const today = now.getDate();

  useEffect(() => {
    fetch("/api/daily-budget-history")
      .then((r) => r.json())
      .then((data) => {
        if (data.history) setHistory(data.history);
      })
      .catch(() => {});
  }, []);

  // Save today's budget + spending once
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    const d = new Date();
    const todayDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    fetch("/api/daily-budget-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayDate, budget: dailyBudget, spent: todaySpent }),
    }).catch(() => {});
  }, [dailyBudget, todaySpent]);

  // Last 12 days from history
  const days: { day: number; month: number; status: "fire" | "fail" | "today" | "nodata"; budget: number; spent: number }[] = [];
  let currentStreak = 0;

  for (let d = 11; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(today - d);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const entry = history.find((h) => h.date === dateStr);
    const dayNum = date.getDate();
    const monthNum = date.getMonth() + 1;

    if (d === 0) {
      // Today — use current props for spending
      days.push({ day: dayNum, month: monthNum, status: "today", budget: dailyBudget, spent: todaySpent });
      continue;
    }

    if (!entry) {
      // No data recorded — mark as fail (unknown)
      currentStreak = 0;
      days.push({ day: dayNum, month: monthNum, status: "nodata", budget: 0, spent: 0 });
      continue;
    }

    if (entry.budget > 0 && entry.spent <= entry.budget) {
      currentStreak++;
      days.push({ day: dayNum, month: monthNum, status: "fire", budget: entry.budget, spent: entry.spent });
    } else {
      currentStreak = 0;
      days.push({ day: dayNum, month: monthNum, status: "fail", budget: entry.budget, spent: entry.spent });
    }
  }

  // Check if today is under budget too
  const todayEntry = days[days.length - 1];
  if (todayEntry && dailyBudget > 0 && todayEntry.spent <= dailyBudget) {
    currentStreak++;
  }

  return (
    <Card className="metric-card savings-streak-card">
      <p className="metric-card-label">{locale === "fi" ? "Säästöputki" : "Savings streak"}</p>
      <div className="savings-streak-dots">
        {days.map((d, i) => (
          <div
            key={i}
            className={`savings-streak-dot ${d.status === "fire" ? "is-fire" : d.status === "fail" ? "is-fail" : d.status === "today" ? (dailyBudget > 0 && d.spent <= dailyBudget ? "is-fire" : "is-today") : "is-neutral"}`}
          >
            {(d.status === "fire" || (d.status === "today" && dailyBudget > 0 && d.spent <= dailyBudget)) && <span className="savings-streak-fire-icon" />}
            {d.status === "fail" && <span className="savings-streak-x-icon" />}
            {d.status === "today" && dailyBudget > 0 && d.spent > dailyBudget && <span className="savings-streak-x-icon" />}
            {d.status === "nodata" && <span className="savings-streak-neutral-dot" />}
            <span className="savings-streak-tooltip">
              <span>{d.day}.{d.month}.</span>
              <span>{d.status === "nodata" ? (locale === "fi" ? "ei dataa" : "no data") : `${fmt(d.status === "today" ? todaySpent : d.spent)}/${fmt(d.budget)} €`}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="metric-card-note">
        {currentStreak > 0
          ? (locale === "fi" ? `Olet onnistunut selviämään alle päiväbudjetin ${currentStreak} päivää putkeen.` : `You've stayed under budget ${currentStreak} days in a row.`)
          : (locale === "fi" ? "Ei putkea vielä. Pysy budjetissa tänään!" : "No streak yet. Stay under budget today!")}
      </p>
    </Card>
  );
}
