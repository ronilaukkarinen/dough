"use client";

import { Card } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart-container";
import { useLocale } from "@/lib/locale-context";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Category {
  name: string;
  amount: number;
  color: string;
}

interface CategoryBreakdownProps {
  categories: Category[];
  total: number;
  currency?: string;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Category }> }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-value text-foreground">{data.name}</p>
        <p className="chart-tooltip-label">{data.amount.toFixed(2)} €</p>
      </div>
    );
  }
  return null;
}

export function CategoryBreakdown({ categories, total, currency = "€" }: CategoryBreakdownProps) {
  const { t } = useLocale();

  return (
    <Card className="category-breakdown-card">
      <h3 className="category-breakdown-title">{t.dashboard.topCategories}</h3>
      <div className="category-breakdown-body">
        <div className="category-breakdown-donut">
          <ChartContainer height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categories} cx="50%" cy="50%" innerRadius={85} outerRadius={140} paddingAngle={2} dataKey="amount">
                  {categories.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="category-breakdown-donut-center">
            <span className="category-breakdown-donut-total">{total.toFixed(2)} {currency}</span>
            <span className="category-breakdown-donut-label">{t.common.total}</span>
          </div>
        </div>
        <div className="category-breakdown-legend">
          {categories.map((cat, i) => (
            <div key={i} className="category-breakdown-legend-item">
              <div className="category-breakdown-legend-name">
                <div className="category-breakdown-legend-dot" style={{ backgroundColor: cat.color }} />
                <span className="category-breakdown-legend-text">{cat.name}</span>
              </div>
              <span className="category-breakdown-legend-amount">{cat.amount.toFixed(2)} {currency}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
