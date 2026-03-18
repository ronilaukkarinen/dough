"use client";

import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface CashFlowProps {
  data: { month: string; income: number; expenses: number; net: number }[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-lg">
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm">
            <span
              className={
                entry.dataKey === "income"
                  ? "text-positive"
                  : entry.dataKey === "expenses"
                  ? "text-negative"
                  : "text-primary"
              }
            >
              {entry.dataKey === "income"
                ? "Income"
                : entry.dataKey === "expenses"
                ? "Expenses"
                : "Net"}
              : €{Math.abs(entry.value).toLocaleString()}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function CashFlowChart({ data }: CashFlowProps) {
  return (
    <Card className="border-border/50 bg-card/80 p-6">
      <h3 className="text-sm font-medium text-muted-foreground">
        Monthly Cash Flow
      </h3>
      <div className="mt-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "#7a8ba0", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "#7a8ba0", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `€${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
            <Bar dataKey="income" fill="#00e676" radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="expenses" fill="#ff6b6b" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
