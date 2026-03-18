"use client";

import { Card } from "@/components/ui/card";
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
      <div className="rounded-lg border border-border/50 bg-popover px-3 py-2 shadow-lg">
        <p className="text-sm font-medium text-foreground">{data.name}</p>
        <p className="text-xs text-muted-foreground">€{data.amount.toLocaleString()}</p>
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
    <Card className="border-border/50 bg-card/80 p-6">
      <h3 className="text-sm font-medium text-muted-foreground">
        Top Categories
      </h3>
      <div className="mt-4 flex items-center gap-6">
        {/* Donut chart */}
        <div className="relative h-[160px] w-[160px] shrink-0">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-foreground">
              {currency}
              {total.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground">total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {categories.map((cat, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm text-foreground">{cat.name}</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {currency}
                {cat.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
