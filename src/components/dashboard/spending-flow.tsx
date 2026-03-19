"use client";

import { useLocale } from "@/lib/locale-context";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";

interface SpendingFlowProps {
  spendingByDay: Record<number, number>;
  daysInMonth: number;
  daysPassed: number;
  dailyDiscretionary: number;
  targetPerDay: number;
  combinedIncome: number;
  savingRate: number;
}

export function SpendingFlow({
  spendingByDay,
  daysInMonth,
  daysPassed,
  dailyDiscretionary,
  targetPerDay,
  combinedIncome,
  savingRate,
}: SpendingFlowProps) {
  const { locale, fmt } = useLocale();
  const target = combinedIncome - savingRate;

  // Build full month data: actual (past) + projected (future)
  const data: { day: number; label: string; actual?: number; projected?: number; target?: number }[] = [];
  let cumulative = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    if (d <= daysPassed) {
      cumulative = spendingByDay[d] || cumulative;
      data.push({
        day: d,
        label: `${d}.`,
        actual: cumulative,
        target: targetPerDay > 0 ? Math.round(targetPerDay * d) : undefined,
      });
    } else {
      // Projected: last actual + daily discretionary per remaining day
      const projected = cumulative + dailyDiscretionary * (d - daysPassed);
      data.push({
        day: d,
        label: `${d}.`,
        projected: Math.round(projected),
        target: targetPerDay > 0 ? Math.round(targetPerDay * d) : undefined,
      });
    }
  }

  // Bridge: add projected start at last actual point
  if (daysPassed > 0 && daysPassed < daysInMonth) {
    data[daysPassed - 1].projected = data[daysPassed - 1].actual;
  }

  const lastActual = data[daysPassed - 1]?.actual || 0;
  const monthEndTarget = target > 0 ? target : 0;
  const diff = monthEndTarget > 0 ? monthEndTarget - lastActual : 0;
  const projectedEnd = lastActual + dailyDiscretionary * (daysInMonth - daysPassed);
  const endDiff = monthEndTarget > 0 ? monthEndTarget - projectedEnd : 0;

  // Status: how are we doing relative to target
  const ratio = monthEndTarget > 0 ? lastActual / (targetPerDay * daysPassed) : 0;
  const status = ratio <= 0.95 ? "good" : ratio <= 1.05 ? "tight" : "danger";
  const statusColor = status === "good" ? "#4ade80" : status === "tight" ? "#facc15" : "#f87171";

  // Gradient stops: map each day's ratio to a color
  const gradientStops = data.filter((d) => d.actual !== undefined).map((d, i, arr) => {
    const pos = arr.length > 1 ? i / (arr.length - 1) : 0.5;
    const dayTarget = targetPerDay > 0 ? targetPerDay * d.day : 0;
    const r = dayTarget > 0 ? (d.actual || 0) / dayTarget : 0;
    const color = r <= 0.9 ? "#4ade80" : r <= 1.05 ? "#facc15" : "#f87171";
    return { pos, color };
  });

  return (
    <div className="spending-flow">
      <div className="spending-flow-chart">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="flowLineGrad" x1="0" y1="0" x2="1" y2="0">
                {gradientStops.map((s, i) => (
                  <stop key={i} offset={`${Math.round(s.pos * 100)}%`} stopColor={s.color} />
                ))}
              </linearGradient>
              <linearGradient id="flowFillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={statusColor} stopOpacity={0.2} />
                <stop offset="100%" stopColor={statusColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: "#52525b", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(daysInMonth / 6)}
            />
            <YAxis hide />
            <Tooltip
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="chart-tooltip">
                    <p className="chart-tooltip-label">{label}</p>
                    {payload.filter((p) => p.value != null).map((p, i) => (
                      <p key={i} className="chart-tooltip-value" style={{ color: p.dataKey === "target" ? "#4ade80" : p.dataKey === "projected" ? "#71717a" : "var(--foreground)" }}>
                        {p.dataKey === "actual" ? (locale === "fi" ? "Kulut" : "Spent") : p.dataKey === "projected" ? (locale === "fi" ? "Ennuste" : "Projected") : (locale === "fi" ? "Vakaa talous" : "Target")}: {fmt(Number(p.value))} €
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />
            {targetPerDay > 0 && (
              <Area
                type="monotone"
                dataKey="target"
                stroke="#4ade80"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                fill="none"
                dot={false}
                strokeOpacity={0.4}
              />
            )}
            <Area
              type="monotone"
              dataKey="projected"
              stroke="#71717a"
              strokeWidth={2}
              strokeDasharray="4 4"
              fill="none"
              dot={false}
              strokeOpacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="url(#flowLineGrad)"
              strokeWidth={3}
              fill="url(#flowFillGrad)"
              dot={false}
            />
            {daysPassed > 0 && (
              <ReferenceDot
                x={data[daysPassed - 1]?.label}
                y={lastActual}
                r={6}
                fill={statusColor}
                stroke="var(--background)"
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {monthEndTarget > 0 && (
        <div className="spending-flow-status" data-status={status}>
          <span className="spending-flow-status-value">
            {endDiff >= 0
              ? `${fmt(Math.abs(endDiff))} € ${locale === "fi" ? "alle" : "under"}`
              : `${fmt(Math.abs(endDiff))} € ${locale === "fi" ? "yli" : "over"}`
            }
          </span>
        </div>
      )}
    </div>
  );
}
