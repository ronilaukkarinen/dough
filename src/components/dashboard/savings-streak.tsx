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

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 2 6 8.5 6 14C6 17.31 8.69 20 12 20C15.31 20 18 17.31 18 14C18 8.5 12 2 12 2Z" fill="url(#flame-grad)" />
      <path d="M12 20C10.34 20 9 18.66 9 17C9 14.5 12 11 12 11C12 11 15 14.5 15 17C15 18.66 13.66 20 12 20Z" fill="url(#flame-inner)" />
      <defs>
        <linearGradient id="flame-grad" x1="12" y1="2" x2="12" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="flame-inner" x1="12" y1="11" x2="12" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde68a" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
    </svg>
  );
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

  // Last 7 days from history
  const days: { day: number; month: number; status: "fire" | "fail" | "today" | "nodata"; budget: number; spent: number }[] = [];
  let currentStreak = 0;

  for (let d = 6; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(today - d);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const entry = history.find((h) => h.date === dateStr);
    const dayNum = date.getDate();
    const monthNum = date.getMonth() + 1;

    if (d === 0) {
      days.push({ day: dayNum, month: monthNum, status: "today", budget: dailyBudget, spent: todaySpent });
      continue;
    }

    if (!entry) {
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
      <div className="metric-card-row">
        <div className="metric-card-icon savings-streak-flame">
          <FlameIcon />
        </div>
        <div>
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
              ? (locale === "fi" ? `${currentStreak} päivää putkeen alle budjetin` : `${currentStreak} days in a row under budget`)
              : (locale === "fi" ? "Ei putkea vielä" : "No streak yet")}
          </p>
        </div>
      </div>
    </Card>
  );
}
