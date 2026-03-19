"use client";

import { Card } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart-container";
import { useLocale } from "@/lib/locale-context";
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

export function CashFlowChart({ data }: CashFlowProps) {
  const { t } = useLocale();

  function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-label chart-tooltip-value-mb">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="chart-tooltip-value">
              <span
                style={{
                  color: entry.dataKey === "income"
                    ? "var(--positive)"
                    : entry.dataKey === "expenses"
                    ? "var(--negative)"
                    : "var(--primary)"
                }}
              >
                {entry.dataKey === "income"
                  ? t.dashboard.income
                  : entry.dataKey === "expenses"
                  ? t.dashboard.expenses
                  : t.dashboard.net}
                : {Math.abs(entry.value).toFixed(2)} €
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  }

  return (
    <Card className="cash-flow-card">
      <h3 className="cash-flow-title">{t.dashboard.monthlyCashFlow}</h3>
      <ChartContainer height={280}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${Math.round(v)}`} width={35} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
            <Bar dataKey="income" fill="#4ade80" radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  );
}
