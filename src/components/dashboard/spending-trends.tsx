"use client";

import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/locale-context";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useMemo } from "react";

interface TrendData {
  category: string;
  thisMonth: number;
  lastMonth: number;
}

interface SpendingTrendsProps {
  trends: TrendData[];
}

export function SpendingTrends({ trends }: SpendingTrendsProps) {
  const { locale, fmt, mask } = useLocale();

  // Pick one random trend to highlight — deterministic per day
  const dailyTrend = useMemo(() => {
    const meaningful = trends.filter((t) => t.lastMonth > 0 && Math.abs(t.thisMonth - t.lastMonth) / t.lastMonth > 0.1);
    if (meaningful.length === 0) return null;

    // Use day of year as seed for deterministic daily pick
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const index = dayOfYear % meaningful.length;
    return meaningful[index];
  }, [trends]);

  if (!dailyTrend) {
    return (
      <Card className="spending-trends-card">
        <h3 className="spending-trends-title">{locale === "fi" ? "Trendi" : "Trend"}</h3>
        <p className="spending-trends-empty">{locale === "fi" ? "Ei tarpeeksi dataa vielä" : "Not enough data yet"}</p>
      </Card>
    );
  }

  const pctChange = Math.round(((dailyTrend.thisMonth - dailyTrend.lastMonth) / dailyTrend.lastMonth) * 100);
  const isUp = pctChange > 0;
  const isDown = pctChange < 0;

  return (
    <Card className="spending-trends-card">
      <h3 className="spending-trends-title">{locale === "fi" ? "Trendi" : "Trend"}</h3>
      <div className="spending-trends-content">
        <div className={`spending-trends-icon ${isUp ? "is-up" : isDown ? "is-down" : "is-flat"}`}>
          {isUp ? <TrendingUp /> : isDown ? <TrendingDown /> : <Minus />}
        </div>
        <div className="spending-trends-text">
          <p className="spending-trends-fact">
            <span className="spending-trends-category">{dailyTrend.category}</span>
            {" "}
            {isUp
              ? (locale === "fi" ? "on nousussa" : "is trending up")
              : isDown
              ? (locale === "fi" ? "on laskussa" : "is trending down")
              : (locale === "fi" ? "on tasainen" : "is flat")}
          </p>
          <p className="spending-trends-detail">
            <span className={isUp ? "text-negative" : isDown ? "text-positive" : ""}>
              {isUp ? "+" : ""}{mask(pctChange)}%
            </span>
            {" "}
            {locale === "fi" ? "vs edellinen kuukausi" : "vs last month"}
          </p>
          <p className="spending-trends-amounts">
            {mask(fmt(dailyTrend.thisMonth))} € {locale === "fi" ? "nyt" : "now"} · {mask(fmt(dailyTrend.lastMonth))} € {locale === "fi" ? "edellinen" : "prev"}
          </p>
        </div>
      </div>
    </Card>
  );
}
