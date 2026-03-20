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

function ratioToColor(r: number): string {
  // r = actual/target. Under 1.0 = good, over = bad
  // 0-0.95 green, 0.95-1.0 green→yellow, 1.0-1.03 yellow→red, 1.03+ red
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const green = [74, 222, 128];
  const yellow = [250, 204, 21];
  const red = [248, 113, 113];
  if (r <= 0.95) return `rgb(${green.join(",")})`;
  if (r <= 1.0) {
    const t = clamp((r - 0.95) / 0.05, 0, 1);
    return `rgb(${lerp(green[0], yellow[0], t)},${lerp(green[1], yellow[1], t)},${lerp(green[2], yellow[2], t)})`;
  }
  if (r <= 1.03) {
    const t = clamp((r - 1.0) / 0.03, 0, 1);
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

  const todayTarget = targetPerDay > 0 ? Math.round(targetPerDay * daysPassed) : 0;
  const todayDiff = todayTarget - lastActual;
  const todayRatio = todayTarget > 0 ? lastActual / todayTarget : 0;
  const ballColor = targetPerDay > 0 ? ratioToColor(todayRatio) : "#818cf8";

  const gradientStops = data.filter((d) => d.actual !== undefined).map((d, i, arr) => {
    const pos = arr.length > 1 ? i / (arr.length - 1) : 0.5;
    const dayTarget = targetPerDay > 0 ? targetPerDay * d.day : 0;
    const r = dayTarget > 0 ? (d.actual || 0) / dayTarget : 0;
    return { pos, color: ratioToColor(r) };
  });

  const bubbleLabel = todayDiff >= 0
    ? `${fmt(Math.abs(todayDiff))} € ${locale === "fi" ? "alle" : "under"}`
    : `${fmt(Math.abs(todayDiff))} € ${locale === "fi" ? "yli" : "over"}`;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const renderDotLabel = (props: any) => {
    const { viewBox } = props;
    if (!viewBox) return null;
    const { x, y } = viewBox;
    if (!monthEndTarget) return null;

    const bw = bubbleLabel.length * 5.8 + 6;
    const bh = 20;
    const bx = x + 8;
    const by = y - bh - 5;

    return (
      <g>
        {/* Short tip from bubble bottom-left toward dot */}
        <path d={`M${bx + 2},${by + bh - 2} L${bx + 9},${by + bh - 2} L${bx + 2},${by + bh + 5} Z`} fill={ballColor} />
        {/* Solid background bubble */}
        <rect x={bx} y={by} width={bw} height={bh} rx={5} fill={ballColor} />
        <text
          x={bx + bw / 2}
          y={by + bh / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#09090b"
          fontSize={11}
          fontWeight={600}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {bubbleLabel}
        </text>
      </g>
    );
  };

  return (
    <div className="spending-flow">
      <div className="spending-flow-chart">
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 36, right: 16, left: -20, bottom: 0 }}>
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
                strokeOpacity={0.25}
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
              strokeOpacity={0.3}
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
                r={5}
                fill="#09090b"
                stroke={ballColor}
                strokeWidth={4}
                label={renderDotLabel}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
