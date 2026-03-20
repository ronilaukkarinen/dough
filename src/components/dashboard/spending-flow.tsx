"use client";

import { useLocale } from "@/lib/locale-context";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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

function ratioToColor(r: number): string {
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const green = [74, 222, 128];
  const yellow = [250, 204, 21];
  const red = [248, 113, 113];
  if (r <= 0.85) return `rgb(${green.join(",")})`;
  if (r <= 1.0) {
    const t = clamp((r - 0.85) / 0.15, 0, 1);
    return `rgb(${lerp(green[0], yellow[0], t)},${lerp(green[1], yellow[1], t)},${lerp(green[2], yellow[2], t)})`;
  }
  if (r <= 1.15) {
    const t = clamp((r - 1.0) / 0.15, 0, 1);
    return `rgb(${lerp(yellow[0], red[0], t)},${lerp(yellow[1], red[1], t)},${lerp(yellow[2], red[2], t)})`;
  }
  return `rgb(${red.join(",")})`;
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

  // Build full month data
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
      const projected = cumulative + dailyDiscretionary * (d - daysPassed);
      data.push({
        day: d,
        label: `${d}.`,
        projected: Math.round(projected),
        target: targetPerDay > 0 ? Math.round(targetPerDay * d) : undefined,
      });
    }
  }

  if (daysPassed > 0 && daysPassed < daysInMonth) {
    data[daysPassed - 1].projected = data[daysPassed - 1].actual;
  }

  const lastActual = data[daysPassed - 1]?.actual || 0;
  const monthEndTarget = target > 0 ? target : 0;

  // Difference at TODAY
  const todayTarget = targetPerDay > 0 ? Math.round(targetPerDay * daysPassed) : 0;
  const todayDiff = todayTarget - lastActual;
  const todayRatio = todayTarget > 0 ? lastActual / todayTarget : 0;
  const status = todayDiff > todayTarget * 0.05 ? "good" : todayDiff >= 0 ? "tight" : "danger";
  const ballColor = targetPerDay > 0 ? ratioToColor(todayRatio) : "#818cf8";
  const statusColor = status === "good" ? "#4ade80" : status === "tight" ? "#facc15" : "#f87171";

  // Gradient stops
  const gradientStops = data.filter((d) => d.actual !== undefined).map((d, i, arr) => {
    const pos = arr.length > 1 ? i / (arr.length - 1) : 0.5;
    const dayTarget = targetPerDay > 0 ? targetPerDay * d.day : 0;
    const r = dayTarget > 0 ? (d.actual || 0) / dayTarget : 0;
    return { pos, color: ratioToColor(r) };
  });

  const bubbleLabel = todayDiff >= 0
    ? `${fmt(Math.abs(todayDiff))} € ${locale === "fi" ? "alle" : "under"}`
    : `${fmt(Math.abs(todayDiff))} € ${locale === "fi" ? "yli" : "over"}`;

  // Position dot + bubble as HTML overlay
  // X: percentage across the chart (days)
  const dotLeftPct = ((daysPassed - 0.5) / daysInMonth) * 100;
  // Y: percentage from top of chart area. Need min/max of all values.
  const allValues = data.flatMap((d) => [d.actual, d.projected, d.target].filter((v): v is number => v !== undefined));
  const maxVal = Math.max(...allValues, 1);
  const minVal = 0;
  const dotTopPct = maxVal > minVal ? (1 - (lastActual - minVal) / (maxVal - minVal)) * 100 : 50;

  return (
    <div className="spending-flow">
      <div className="spending-flow-chart">
        {monthEndTarget > 0 && daysPassed > 0 && (
          <div
            className="spending-flow-bubble"
            data-status={status}
            style={{ left: `calc(${bubbleLeftPct}% + 8px)` }}
          >
            <span className="spending-flow-bubble-text">{bubbleLabel}</span>
            <svg className="spending-flow-bubble-tip" width="10" height="8" viewBox="0 0 10 8">
              <path d="M0,0 L10,0 L2,8 Z" fill={`${statusColor}33`} />
            </svg>
          </div>
        )}
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 6, right: 16, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="flowLineGrad" x1="0" y1="0" x2="1" y2="0">
                {gradientStops.map((s, i) => (
                  <stop key={i} offset={`${Math.round(s.pos * 100)}%`} stopColor={s.color} />
                ))}
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
              strokeWidth={5}
              fill="none"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        {daysPassed > 0 && (
          <div
            className="spending-flow-dot"
            style={{
              left: `calc(${dotLeftPct}%)`,
              top: `calc(${dotTopPct}% - 2px)`,
              background: ballColor,
              boxShadow: `0 0 8px ${ballColor}66`,
            }}
          />
        )}
        {monthEndTarget > 0 && daysPassed > 0 && (
          <div
            className="spending-flow-bubble"
            style={{
              left: `calc(${dotLeftPct}% + 14px)`,
              top: `calc(${dotTopPct}% - 28px)`,
            }}
          >
            <span className="spending-flow-bubble-text" style={{ background: `${ballColor}33`, color: ballColor }}>
              {bubbleLabel}
            </span>
            <svg className="spending-flow-bubble-tip" width="10" height="8" viewBox="0 0 10 8">
              <path d="M0,0 L8,0 L0,8 Z" fill={`${ballColor}33`} />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
