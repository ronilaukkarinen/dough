"use client";

import { Card } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart-container";
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
        <p className="chart-tooltip-value" style={{ color: "var(--foreground)" }}>{data.name}</p>
        <p className="chart-tooltip-label">{data.amount} €</p>
      </div>
    );
  }
  return null;
}

export function CategoryBreakdown({
  categories,
  total,
  currency = "€",
}: CategoryBreakdownProps) {
  return (
    <Card className="category-breakdown-card">
      <h3 className="category-breakdown-title">Top categories</h3>
      <div className="category-breakdown-body">
        {/* Donut chart */}
        <div className="category-breakdown-donut">
          <ChartContainer height={160}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={2}
                  dataKey="amount"
                >
                  {categories.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="category-breakdown-donut-center">
            <span className="category-breakdown-donut-total">
              {total} {currency}
            </span>
            <span className="category-breakdown-donut-label">total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="category-breakdown-legend">
          {categories.map((cat, i) => (
            <div key={i} className="category-breakdown-legend-item">
              <div className="category-breakdown-legend-name">
                <div
                  className="category-breakdown-legend-dot"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="category-breakdown-legend-text">{cat.name}</span>
              </div>
              <span className="category-breakdown-legend-amount">
                {cat.amount} {currency}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
