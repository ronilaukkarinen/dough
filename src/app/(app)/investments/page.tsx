"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/lib/locale-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Wallet,
  Calendar,
  Loader2,
  Save,
  Check,
} from "lucide-react";
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
import { F } from "@/components/ui/f";

interface InvestmentData {
  id: string;
  name: string;
  balance: number;
  monthlyContribution: number;
  expectedReturn: number;
  monthlyTransferred: number;
  notes: string;
  ticker: string;
}

interface TickerData {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  currency: string;
  dayChangePct: number;
  week52High: number;
  week52Low: number;
  sparkline: number[];
}

let tickerChartId = 0;

function TickerChart({ data, positive, currency, fmt: fmtFn, range }: { data: number[]; positive: boolean; currency: string; fmt: (v: number) => string; range: "1W" | "6M" | "MAX" }) {
  if (data.length < 2) return null;
  const uid = `tc-${++tickerChartId}`;
  const sliceCount = range === "1W" ? 5 : range === "6M" ? 130 : data.length;
  const sliced = data.length > sliceCount ? data.slice(-sliceCount) : data;
  const rangePositive = sliced.length >= 2 ? sliced[sliced.length - 1] >= sliced[0] : positive;
  const color = rangePositive ? "#4ade80" : "#f87171";
  const chartData = sliced.map((v, i) => ({ i, price: v }));
  return (
    <ResponsiveContainer width="100%" height={100}>
      <AreaChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={[0, "auto"]} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const val = Number(payload[0].value);
            return (
              <div className="chart-tooltip">
                <p className="chart-tooltip-value" style={{ color, fontSize: "0.6875rem" }}>{fmtFn(val)} {currency}</p>
              </div>
            );
          }}
        />
        <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fill={`url(#${uid})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function calculateProjection(
  investments: InvestmentData[],
  years: number
): { timeline: { year: string; value: number; invested: number }[]; finalValue: number; totalInvested: number; totalReturns: number } {
  if (investments.length === 0) return { timeline: [], finalValue: 0, totalInvested: 0, totalReturns: 0 };

  const timeline: { year: string; value: number; invested: number }[] = [];
  let totalValue = investments.reduce((s, i) => s + i.balance, 0);
  let totalInvested = totalValue;
  const totalMonthly = investments.reduce((s, i) => s + i.monthlyContribution, 0);

  // Weighted average return
  const weightedReturn = totalMonthly > 0
    ? investments.reduce((s, i) => s + i.expectedReturn * i.monthlyContribution, 0) / totalMonthly
    : investments.length > 0
      ? investments.reduce((s, i) => s + i.expectedReturn, 0) / investments.length
      : 7;

  const monthlyRate = weightedReturn / 100 / 12;

  timeline.push({ year: "0", value: Math.round(totalValue), invested: Math.round(totalInvested) });

  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      totalValue = totalValue * (1 + monthlyRate) + totalMonthly;
      totalInvested += totalMonthly;
    }
    timeline.push({ year: String(year), value: Math.round(totalValue), invested: Math.round(totalInvested) });
  }

  return {
    timeline,
    finalValue: Math.round(totalValue),
    totalInvested: Math.round(totalInvested),
    totalReturns: Math.round(totalValue - totalInvested),
  };
}

export default function InvestmentsPage() {
  const { t, locale, fmt, mask } = useLocale();
  const [investments, setInvestments] = useState<InvestmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [projectionYears, setProjectionYears] = useState(20);
  const [tickerData, setTickerData] = useState<Record<string, TickerData>>({});
  const [chartRange, setChartRange] = useState<"1W" | "6M" | "MAX">("6M");

  useEffect(() => {
    console.debug("[investments] Loading investment accounts");
    fetch("/api/investments")
      .then((r) => r.json())
      .then((data) => {
        if (data.investments) {
          console.info("[investments] Loaded", data.investments.length, "investment accounts");
          setInvestments(data.investments);
        }
      })
      .catch((err) => console.error("[investments] Load error:", err))
      .finally(() => setLoading(false));
  }, []);

  // Fetch ticker data for investments with tickers
  useEffect(() => {
    const tickers = investments.filter((i) => i.ticker).map((i) => i.ticker);
    if (tickers.length === 0) return;
    const unique = [...new Set(tickers)].join(",");
    console.debug("[investments] Fetching ticker data for:", unique);
    fetch(`/api/ticker?symbols=${encodeURIComponent(unique)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tickers) {
          console.info("[investments] Got ticker data for", Object.keys(data.tickers).length, "symbols");
          setTickerData(data.tickers);
        }
      })
      .catch((err) => console.error("[investments] Ticker fetch error:", err));
  }, [investments]);

  const saveOverride = async (inv: InvestmentData) => {
    setSaving(inv.id);
    console.info("[investments] Saving override for", inv.name);
    try {
      await fetch("/api/investments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ynab_account_id: inv.id,
          monthly_contribution: inv.monthlyContribution,
          expected_return: inv.expectedReturn,
          ticker: inv.ticker,
        }),
      });
    } catch (err) {
      console.error("[investments] Save error:", err);
    } finally {
      setTimeout(() => setSaving(null), 1000);
    }
  };

  const updateInvestment = (id: string, field: keyof InvestmentData, value: number) => {
    setInvestments((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i));
  };

  const totalValue = investments.reduce((s, i) => s + i.balance, 0);
  const totalMonthly = investments.reduce((s, i) => s + i.monthlyContribution, 0);
  const projection = calculateProjection(investments, projectionYears);

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="page-loading-spinner animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">{t.investments.title}</h1>
          <p className="page-subtitle">{t.investments.subtitle}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="page-grid-3-sm">
        <Card className="metric-card">
          <div className="metric-card-row">
            <div className="metric-card-icon" data-color="positive">
              <TrendingUp />
            </div>
            <div>
              <p className="metric-card-label">{t.investments.totalValue}</p>
              <p className="metric-card-value"><F v={totalValue} /></p>
              <p className="metric-card-note">{investments.length} {locale === "fi" ? "sijoitusta" : "investments"}</p>
            </div>
          </div>
        </Card>
        <Card className="metric-card">
          <div className="metric-card-row">
            <div className="metric-card-icon" data-color="primary">
              <Wallet />
            </div>
            <div>
              <p className="metric-card-label">{t.investments.totalMonthly}</p>
              <p className="metric-card-value"><F v={totalMonthly} /></p>
              <p className="metric-card-note">{fmt(totalMonthly * 12)} €/{locale === "fi" ? "v" : "y"}</p>
            </div>
          </div>
        </Card>
        <Card className="metric-card">
          <div className="metric-card-row">
            <div className="metric-card-icon" data-color="chart-3">
              <Calendar />
            </div>
            <div>
              <p className="metric-card-label">{t.investments.projectedValue}</p>
              <p className="metric-card-value"><F v={projection.finalValue} /></p>
              <p className="metric-card-note">{projectionYears} {locale === "fi" ? "v" : "y"}, +{fmt(projection.totalReturns)} € {locale === "fi" ? "tuottoa" : "returns"}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Projection chart */}
      {investments.length > 0 && (
        <div className="form-stack">
          <div className="payoff-header">
            <h2 className="payoff-title">{t.investments.projectedGrowth}</h2>
            <div className="form-row">
              <Label className="payoff-extra-label">{locale === "fi" ? "Ajanjakso:" : "Time horizon:"}</Label>
              <Input
                type="number"
                value={projectionYears}
                onChange={(e) => setProjectionYears(Math.max(1, Math.min(50, Number(e.target.value))))}
                className="payoff-extra-input"
              />
              <span className="payoff-extra-label">{locale === "fi" ? "vuotta" : "years"}</span>
            </div>
          </div>

          <Card className="metric-card">
            <div className="payoff-stats">
              <div>
                <span className="payoff-stats-label">{t.investments.projectedValue} </span>
                <span className="payoff-stats-value" data-color="positive"><F v={projection.finalValue} /></span>
              </div>
              <div>
                <span className="payoff-stats-label">{t.investments.invested} </span>
                <span className="payoff-stats-value"><F v={projection.totalInvested} /></span>
              </div>
              <div>
                <span className="payoff-stats-label">{t.investments.returns} </span>
                <span className="payoff-stats-value" data-color="positive"><>+<F v={projection.totalReturns} /></></span>
              </div>
            </div>
            {projection.timeline.length > 1 && (
              <ChartContainer height={250}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projection.timeline} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}${locale === "fi" ? "v" : "y"}`} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => mask(v >= 1000000 ? `${(v / 1000000).toFixed(1)}M €` : v >= 1000 ? `${(v / 1000).toFixed(0)}k €` : `${Math.round(v)} €`)} width={55} />
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="chart-tooltip">
                            <p className="chart-tooltip-label">{label} {locale === "fi" ? "vuotta" : "years"}</p>
                            <p className="chart-tooltip-value text-positive">{fmt(Number(payload[0].value))} €</p>
                            <p className="chart-tooltip-value text-foreground">{locale === "fi" ? "Sijoitettu" : "Invested"}: {fmt(Number(payload[1].value))} €</p>
                          </div>
                        ) : null
                      }
                    />
                    <Area type="monotone" dataKey="value" stroke="#4ade80" strokeWidth={2} fill="url(#investGrad)" />
                    <Area type="monotone" dataKey="invested" stroke="#818cf8" strokeWidth={1.5} fill="url(#investedGrad)" strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </Card>
        </div>
      )}

      {/* Range filter + Investment accounts list */}
      {investments.length > 0 && (
        <>
          <div className="chart-range-filter">
            {(["1W", "6M", "MAX"] as const).map((r) => (
              <button key={r} type="button" className={`chart-range-btn ${chartRange === r ? "is-active" : ""}`} onClick={() => setChartRange(r)}>
                {r}
              </button>
            ))}
          </div>
          <Card className="list-card">
            {investments.map((inv) => (
            <div key={inv.id} className="debt-item">
              <div className="debt-item-header">
                <div>
                  <p className="debt-item-name">{inv.name}</p>
                  {inv.monthlyTransferred > 0 && (
                    <p className="debt-item-meta">
                      {locale === "fi" ? "Siirretty tässä kuussa" : "Transferred this month"}: <F v={inv.monthlyTransferred} />
                    </p>
                  )}
                </div>
                <div className="debt-item-right">
                  <p className="debt-item-amount text-positive"><F v={inv.balance} /></p>
                </div>
              </div>
              {inv.ticker && tickerData[inv.ticker.toUpperCase()] && (() => {
                const td = tickerData[inv.ticker.toUpperCase()];
                const isIndex = inv.ticker.startsWith("^") || inv.ticker.toUpperCase().startsWith("SELIGSON:");
                return (
                  <div className="investment-ticker-info">
                    <p className="debt-item-meta">
                      {isIndex ? `${locale === "fi" ? "Indeksi" : "Index"}: ` : ""}{td.name}: {td.price.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {td.currency}
                      {" "}
                      <span className={td.dayChangePct >= 0 ? "text-positive" : "text-negative"}>
                        {td.dayChangePct >= 0 ? "+" : ""}{td.dayChangePct}% {locale === "fi" ? "tänään" : "today"}
                      </span>
                    </p>
                    {td.sparkline?.length > 1 && <TickerChart data={td.sparkline} positive={td.dayChangePct >= 0} currency={td.currency} fmt={fmt} range={chartRange} />}
                  </div>
                );
              })()}
              <div className="debt-edit-row">
                <div className="debt-edit-field">
                  <Label className="debt-edit-label">{locale === "fi" ? "Kk-sijoitus €" : "Monthly €"}</Label>
                  <Input
                    type="number"
                    step="1"
                    value={inv.monthlyContribution || ""}
                    onChange={(e) => updateInvestment(inv.id, "monthlyContribution", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="debt-edit-input"
                  />
                </div>
                <div className="debt-edit-field">
                  <Label className="debt-edit-label">{locale === "fi" ? "Tuotto %" : "Return %"}</Label>
                  {(() => {
                    const td = inv.ticker ? tickerData[inv.ticker.toUpperCase()] : null;
                    if (td && td.sparkline && td.sparkline.length >= 2) {
                      const first = td.sparkline[0];
                      const last = td.sparkline[td.sparkline.length - 1];
                      const yearReturn = first > 0 ? Math.round(((last - first) / first) * 1000) / 10 : 0;
                      return (
                        <Input
                          type="text"
                          value={`${yearReturn > 0 ? "+" : ""}${yearReturn}%`}
                          readOnly
                          className="debt-edit-input"
                        />
                      );
                    }
                    return (
                      <Input
                        type="number"
                        step="0.1"
                        value={inv.expectedReturn || ""}
                        onChange={(e) => updateInvestment(inv.id, "expectedReturn", parseFloat(e.target.value) || 0)}
                        placeholder="7"
                        className="debt-edit-input"
                      />
                    );
                  })()}
                </div>
                <div className="debt-edit-field">
                  <Label className="debt-edit-label">Ticker</Label>
                  <Input
                    type="text"
                    value={inv.ticker || ""}
                    onChange={(e) => setInvestments((prev) => prev.map((i) => i.id === inv.id ? { ...i, ticker: e.target.value } : i))}
                    placeholder="NVDA"
                    className="debt-edit-input"
                    list={`ticker-suggest-${inv.id}`}
                  />
                  <datalist id={`ticker-suggest-${inv.id}`}>
                    <option value="^OMXH25" label="OMX Helsinki 25" />
                    <option value="^GSPC" label="S&P 500" />
                    <option value="^STOXX50E" label="Euro Stoxx 50" />
                    <option value="BTC-USD" label="Bitcoin" />
                    <option value="ETH-USD" label="Ethereum" />
                    <option value="NVDA" label="NVIDIA" />
                    <option value="AAPL" label="Apple" />
                    <option value="MSFT" label="Microsoft" />
                    <option value="TSLA" label="Tesla" />
                    <option value="AMZN" label="Amazon" />
                    <option value="VWCE.DE" label="Vanguard FTSE All-World (Revolut proxy)" />
                    <option value="SELIGSON:brands" label="Seligson Global Top 25 Brands" />
                    <option value="SELIGSON:suomi" label="Seligson Finland Index" />
                    <option value="SELIGSON:phoebus" label="Seligson Phoebus" />
                  </datalist>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => saveOverride(inv)}
                >
                  {saving === inv.id ? <Check /> : <Save />}
                </Button>
              </div>
            </div>
          ))}
        </Card>
        </>
      )}
    </div>
  );
}
