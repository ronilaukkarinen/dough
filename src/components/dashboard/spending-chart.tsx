"use client";

import { Card } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart-container";
import { useLocale } from "@/lib/locale-context";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SpendingChartProps {
  data: { date: string; spent: number; budget: number }[];
}

export function SpendingChart({ data }: SpendingChartProps) {
  const { t } = useLocale();

  function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="chart-tooltip-value">
              <span style={{ color: entry.dataKey === "spent" ? "var(--chart-1)" : "var(--muted-foreground)" }}>
                {entry.dataKey === "spent" ? t.dashboard.spent : t.dashboard.budget}:{" "}
                {entry.value.toFixed(2)} €
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  }

  return (
    <Card className="spending-chart-card">
      <h3 className="spending-chart-title">{t.dashboard.spendingThisMonth}</h3>
      <ChartContainer height={280}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 4, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="spentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#71717a" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#71717a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v)} €`} width={55} domain={[0, "auto"]} allowDataOverflow={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="budget" stroke="#71717a" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#budgetGradient)" />
            <Area type="monotone" dataKey="spent" stroke="#818cf8" strokeWidth={2} fill="url(#spentGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  );
}
