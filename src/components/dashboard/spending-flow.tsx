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

  // Status: based on projected end-of-month vs target
  const status = endDiff > monthEndTarget * 0.05 ? "good" : endDiff >= 0 ? "tight" : "danger";
  const bubbleText = endDiff >= 0
    ? `${Math.round(Math.abs(endDiff))} € alle`
    : `${Math.round(Math.abs(endDiff))} € yli`;
  const bubbleWidth = Math.max(60, bubbleText.length * 6.5 + 12);
  // Ball color = end of line gradient color (matches the last data point's ratio)
  const lastDayTarget = targetPerDay > 0 ? targetPerDay * daysPassed : 0;
  const lastRatio = lastDayTarget > 0 ? lastActual / lastDayTarget : 0;
  const ballColor = targetPerDay > 0 ? ratioToColor(lastRatio) : "#818cf8";
  const statusColor = status === "good" ? "#4ade80" : status === "tight" ? "#facc15" : "#f87171";

  // Gradient stops: smooth RGB blend based on spending ratio vs target
  function ratioToColor(r: number): string {
    // 0.0-0.85 = green, 0.85-1.0 = green→yellow, 1.0-1.15 = yellow→red, 1.15+ = red
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
    const green = [74, 222, 128];   // #4ade80
    const yellow = [250, 204, 21];  // #facc15
    const red = [248, 113, 113];    // #f87171
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

  const gradientStops = data.filter((d) => d.actual !== undefined).map((d, i, arr) => {
    const pos = arr.length > 1 ? i / (arr.length - 1) : 0.5;
    const dayTarget = targetPerDay > 0 ? targetPerDay * d.day : 0;
    const r = dayTarget > 0 ? (d.actual || 0) / dayTarget : 0;
    return { pos, color: ratioToColor(r) };
  });

  return (
    <div className="spending-flow">
      <div className="spending-flow-chart">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 32, right: 12, left: -20, bottom: 0 }}>
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
            {daysPassed > 0 && (
              <ReferenceDot
                x={data[daysPassed - 1]?.label}
                y={lastActual}
                r={7}
                fill={ballColor}
                stroke="var(--background)"
                strokeWidth={2}
              >
                {monthEndTarget > 0 && (
                  <g>
                    {/* Speech bubble tip pointing down-left to the dot */}
                    <polygon
                      points="-2,-6 6,-6 2,-1"
                      fill={`${statusColor}33`}
                    />
                    {/* Speech bubble body */}
                    <rect
                      x={-2}
                      y={-24}
                      width={bubbleWidth}
                      height={18}
                      rx={4}
                      fill={`${statusColor}33`}
                    />
                    <text
                      x={-2 + bubbleWidth / 2}
                      y={-12}
                      textAnchor="middle"
                      fill={statusColor}
                      fontSize={10}
                      fontWeight={600}
                      fontFamily="var(--font-geist-sans), system-ui, sans-serif"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {endDiff >= 0
                        ? `${fmt(Math.abs(endDiff))} € ${locale === "fi" ? "alle" : "under"}`
                        : `${fmt(Math.abs(endDiff))} € ${locale === "fi" ? "yli" : "over"}`
                      }
                    </text>
                  </g>
                )}
              </ReferenceDot>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
