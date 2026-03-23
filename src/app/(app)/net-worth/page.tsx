"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/lib/locale-context";
import { useYnab } from "@/lib/ynab-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { RefreshCw, TrendingUp, TrendingDown, Wallet, Loader2 } from "lucide-react";
import { F } from "@/components/ui/f";

interface Snapshot {
  date: string;
  checking: number;
  savings: number;
  investments: number;
  debts: number;
  net_worth: number;
}

function nwColor(value: number): string {
  if (value >= 0) return "rgb(74, 222, 128)";
  return "rgb(248, 113, 113)";
}

function changeColor(diff: number): string {
  if (diff > 0) return "var(--positive)";
  if (diff < 0) return "var(--negative)";
  return "var(--muted-foreground)";
}

export default function NetWorthPage() {
  const { t, locale, fmt, mask } = useLocale();
  const { connected, data: ynabData } = useYnab();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);

  useEffect(() => {
    console.debug("[net-worth] Loading snapshots");
    fetch("/api/net-worth")
      .then((r) => r.json())
      .then((data) => {
        if (data.snapshots) {
          console.info("[net-worth] Loaded", data.snapshots.length, "snapshots");
          setSnapshots(data.snapshots);
        }
      })
      .catch((err) => console.error("[net-worth] Load error:", err))
      .finally(() => setLoading(false));
  }, []);

  const takeSnapshot = async () => {
    setSnapshotting(true);
    console.info("[net-worth] Taking snapshot");
    try {
      const res = await fetch("/api/net-worth", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSnapshots((prev) => {
          const existing = prev.findIndex((s) => s.date === data.snapshot.date);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = data.snapshot;
            return updated;
          }
          return [...prev, data.snapshot];
        });
        console.info("[net-worth] Snapshot taken");
      }
    } catch (err) {
      console.error("[net-worth] Snapshot error:", err);
    } finally {
      setSnapshotting(false);
    }
  };

  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  // Weekly change
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekAgoStr = oneWeekAgo.toISOString().slice(0, 10);
  const weekAgoSnapshot = [...snapshots].reverse().find((s) => s.date <= weekAgoStr);
  const weeklyChange = latest && weekAgoSnapshot ? latest.net_worth - weekAgoSnapshot.net_worth : null;

  // Find top performer from YNAB accounts (biggest balance among investments)
  const investmentAccounts = ynabData?.summary?.accounts?.filter((a) => a.type === "otherAsset") || [];
  const topPerformer = investmentAccounts.length > 0
    ? investmentAccounts.reduce((best, a) => a.balance > best.balance ? a : best, investmentAccounts[0])
    : null;

  // Chart data with gradient colors
  const chartData = snapshots.map((s, i) => ({
    date: `${parseInt(s.date.split("-")[2], 10)}.${parseInt(s.date.split("-")[1], 10)}`,
    netWorth: Math.round(s.net_worth),
    prev: i > 0 ? Math.round(snapshots[i - 1].net_worth) : Math.round(s.net_worth),
  }));

  // Dynamic gradient stops based on positive/negative values
  const minNw = Math.min(...chartData.map((d) => d.netWorth));
  const maxNw = Math.max(...chartData.map((d) => d.netWorth));
  const nwRange = maxNw - minNw || 1;
  const gradientStops = chartData.map((d, i, arr) => {
    const pos = arr.length > 1 ? i / (arr.length - 1) : 0.5;
    return { pos, color: nwColor(d.netWorth) };
  });

  if (!connected) {
    return (
      <div className="page-stack">
        <h1 className="page-heading">{t.dashboard.netWorth}</h1>
        <p className="page-subtitle">{t.settings.ynabDescription}</p>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <h1 className="page-heading">{t.dashboard.netWorth}</h1>
        <Button variant="outline" size="sm" onClick={takeSnapshot} disabled={snapshotting}>
          <RefreshCw className={snapshotting ? "icon-sm animate-spin" : "icon-sm"} />
        </Button>
      </div>

      {loading ? (
        <div className="page-loading">
          <Loader2 className="page-loading-spinner animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary paragraph */}
          {latest && (
            <Card className="ai-summary-card">
              <div className="ai-summary-text">
                <p>
                  {locale === "fi" ? "Nettovarallisuutenne on " : "Your net worth is "}
                  <strong style={{ color: latest.net_worth >= 0 ? "var(--positive)" : "var(--negative)" }}>
                    <F v={latest.net_worth} s=" €" />
                  </strong>
                  {weeklyChange !== null && weeklyChange !== 0 && (
                    <>
                      {locale === "fi" ? ", se on " : ", it has "}
                      {weeklyChange > 0
                        ? (locale === "fi" ? "kasvanut " : "grown ")
                        : (locale === "fi" ? "laskenut " : "decreased ")}
                      <strong style={{ color: changeColor(weeklyChange) }}>
                        {weeklyChange > 0 ? "+" : ""}<F v={weeklyChange} s=" €" />
                      </strong>
                      {locale === "fi" ? " viime viikolta" : " from last week"}
                    </>
                  )}
                  {weeklyChange === 0 && (
                    <>
                      {locale === "fi" ? ", pysynyt samana viime viikolta" : ", stayed the same from last week"}
                    </>
                  )}
                  {weeklyChange === null && snapshots.length <= 1 && (
                    <>
                      {locale === "fi" ? ". Ota tilannekuvia nähdäksesi kehityksen" : ". Take snapshots to track progress"}
                    </>
                  )}
                  {"."}
                  {topPerformer && topPerformer.balance > 0 && (
                    <>
                      {" "}
                      {locale === "fi" ? "Suurin sijoitus on " : "Largest investment is "}
                      <strong style={{ color: "var(--positive)" }}>{topPerformer.name}</strong>
                      {" ("}
                      <strong style={{ color: "var(--positive)" }}><F v={topPerformer.balance} s=" €" /></strong>
                      {")."}
                    </>
                  )}
                </p>
              </div>
            </Card>
          )}

          {/* Dynamic chart */}
          {chartData.length > 1 && (
            <Card className="net-worth-chart-card">
              <ChartContainer height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nwLineGrad" x1="0" y1="0" x2="1" y2="0">
                        {gradientStops.map((s, i) => (
                          <stop key={i} offset={`${Math.round(s.pos * 100)}%`} stopColor={s.color} />
                        ))}
                      </linearGradient>
                      <linearGradient id="nwFillGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={latest && latest.net_worth >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={latest && latest.net_worth >= 0 ? "#4ade80" : "#f87171"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => mask(v >= 1000 ? `${(v/1000).toFixed(0)}k €` : `${Math.round(v)} €`)} width={50} domain={["auto", "auto"]} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const val = Number(payload[0].value);
                        return (
                          <div className="chart-tooltip">
                            <p className="chart-tooltip-label">{label}</p>
                            <p className="chart-tooltip-value" style={{ color: nwColor(val) }}><strong>{fmt(val)} €</strong></p>
                          </div>
                        );
                      }}
                    />
                    <Area type="monotone" dataKey="netWorth" stroke="url(#nwLineGrad)" strokeWidth={3} fill="url(#nwFillGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </Card>
          )}

          {/* Stat cards */}
          {latest && (
            <div className="net-worth-grid">
              <Card className="net-worth-card">
                <div className="net-worth-card-row">
                  <div className="net-worth-card-icon" data-color="primary">
                    <Wallet />
                  </div>
                  <div>
                    <p className="net-worth-card-label">{t.dashboard.accounts}</p>
                    <p className="net-worth-card-value"><F v={latest.checking + latest.savings} s=" €" /></p>
                  </div>
                </div>
              </Card>

              <Card className="net-worth-card">
                <div className="net-worth-card-row">
                  <div className="net-worth-card-icon" data-color="positive">
                    <TrendingUp />
                  </div>
                  <div>
                    <p className="net-worth-card-label">{t.dashboard.investments}</p>
                    <p className="net-worth-card-value text-positive"><F v={latest.investments} s=" €" /></p>
                  </div>
                </div>
              </Card>

              <Card className="net-worth-card">
                <div className="net-worth-card-row">
                  <div className="net-worth-card-icon" data-color="negative">
                    <TrendingDown />
                  </div>
                  <div>
                    <p className="net-worth-card-label">{t.debts.title}</p>
                    <p className="net-worth-card-value text-negative"><F v={latest.debts} s=" €" /></p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {chartData.length <= 1 && (
            <p className="page-subtitle">
              {snapshots.length === 0
                ? (locale === "fi" ? "Ota ensimmäinen tilannekuva aloittaaksesi varallisuuden seuranta." : "Take your first snapshot to start tracking net worth over time.")
                : (locale === "fi" ? "Jatka tilannekuvien ottamista nähdäksesi varallisuuden kehityksen." : "Keep taking snapshots to see your net worth trend.")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
