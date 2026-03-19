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
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { RefreshCw, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface Snapshot {
  date: string;
  checking: number;
  savings: number;
  investments: number;
  debts: number;
  net_worth: number;
}

export default function NetWorthPage() {
  const { t } = useLocale();
  const { connected } = useYnab();
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

  const chartData = snapshots.map((s) => ({
    date: `${parseInt(s.date.split("-")[2], 10)}.${parseInt(s.date.split("-")[1], 10)}`,
    netWorth: Math.round(s.net_worth),
    investments: Math.round(s.investments),
    debts: Math.round(s.debts),
  }));

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
          {latest && (
            <div className="net-worth-grid">
              <Card className="net-worth-hero">
                <p className="net-worth-hero-value" data-positive={latest.net_worth >= 0 || undefined}>
                  {latest.net_worth.toFixed(2)} €
                </p>
              </Card>

              <Card className="net-worth-card">
                <div className="net-worth-card-row">
                  <div className="net-worth-card-icon" data-color="positive">
                    <TrendingUp />
                  </div>
                  <div>
                    <p className="net-worth-card-label">{t.dashboard.investments}</p>
                    <p className="net-worth-card-value text-positive">{latest.investments.toFixed(2)} €</p>
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
                    <p className="net-worth-card-value text-negative">{latest.debts.toFixed(2)} €</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {chartData.length > 1 && (
            <Card className="net-worth-card net-worth-chart-card">
              <ChartContainer height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v)} €`} width={65} domain={["auto", "auto"]} />
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="chart-tooltip">
                            <p className="chart-tooltip-label">{label}</p>
                            <p className="chart-tooltip-value text-foreground">{Number(payload[0].value).toFixed(2)} €</p>
                          </div>
                        ) : null
                      }
                    />
                    <Area type="monotone" dataKey="netWorth" stroke="#818cf8" strokeWidth={2} fill="url(#nwGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </Card>
          )}

          {chartData.length <= 1 && (
            <p className="page-subtitle">
              {snapshots.length === 0
                ? "Take your first snapshot to start tracking net worth over time."
                : "Keep taking snapshots to see your net worth trend."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
