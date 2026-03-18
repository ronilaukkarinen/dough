"use client";

import { Card } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart-container";
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
  title?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="chart-tooltip-value">
            <span style={{ color: entry.dataKey === "spent" ? "var(--chart-1)" : "var(--muted-foreground)" }}>
              {entry.dataKey === "spent" ? "Spent" : "Budget"}:{" "}
              {entry.value} €
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function SpendingChart({ data, title = "Spending this month" }: SpendingChartProps) {
  return (
    <Card className="spending-chart-card">
      <h3 className="spending-chart-title">{title}</h3>
      <ChartContainer height={280}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="spentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4d94ff" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#4d94ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7a8ba0" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#7a8ba0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#7a8ba0", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "#7a8ba0", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v} €`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="budget"
              stroke="#7a8ba0"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="url(#budgetGradient)"
            />
            <Area
              type="monotone"
              dataKey="spent"
              stroke="#4d94ff"
              strokeWidth={2}
              fill="url(#spentGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  );
}
