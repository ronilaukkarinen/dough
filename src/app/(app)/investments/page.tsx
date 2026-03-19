"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocale } from "@/lib/locale-context";
import { useEvent } from "@/lib/use-events";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChartContainer } from "@/components/ui/chart-container";
import {
  Plus,
  Loader2,
  Check,
  TrendingUp,
  Wallet,
  Calendar,
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

interface Investment {
  id: number;
  name: string;
  monthly_amount: number;
  expected_day: number;
  expected_return: number;
  current_value: number;
  is_active: number;
  is_paid: boolean;
  paid_amount: number | null;
  patterns: string[];
}

function calculateProjection(
  currentValue: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number
): { timeline: { year: string; value: number; invested: number }[]; finalValue: number; totalInvested: number; totalReturns: number } {
  const monthlyRate = annualReturn / 100 / 12;
  const timeline: { year: string; value: number; invested: number }[] = [];
  let value = currentValue;
  let totalInvested = currentValue;

  timeline.push({ year: "0", value: Math.round(value), invested: Math.round(totalInvested) });

  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      value = value * (1 + monthlyRate) + monthlyContribution;
      totalInvested += monthlyContribution;
    }
    timeline.push({ year: String(year), value: Math.round(value), invested: Math.round(totalInvested) });
  }

  return {
    timeline,
    finalValue: Math.round(value),
    totalInvested: Math.round(totalInvested),
    totalReturns: Math.round(value - totalInvested),
  };
}

export default function InvestmentsPage() {
  const { t, locale } = useLocale();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Investment | null>(null);
  const [projectionYears, setProjectionYears] = useState(20);
  const addFormRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  const loadInvestments = useCallback(() => {
    console.debug("[investments] Loading investments");
    fetch("/api/investments")
      .then((r) => r.json())
      .then((data) => {
        if (data.investments) {
          console.info("[investments] Loaded", data.investments.length, "investments");
          setInvestments(data.investments);
        }
      })
      .catch((err) => console.error("[investments] Load error:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadInvestments(); }, [loadInvestments]);
  useEvent("data:updated", useCallback(() => { loadInvestments(); }, [loadInvestments]));
  useEvent("sync:complete", useCallback(() => { loadInvestments(); }, [loadInvestments]));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = addFormRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const body = {
      name: fd.get("name") as string,
      monthly_amount: parseFloat((fd.get("monthly_amount") as string).replace(",", ".")),
      expected_day: parseInt(fd.get("expected_day") as string, 10) || 1,
      expected_return: parseFloat((fd.get("expected_return") as string || "7").replace(",", ".")) || 7,
      current_value: parseFloat((fd.get("current_value") as string || "0").replace(",", ".")) || 0,
    };
    console.info("[investments] Adding:", body.name);
    try {
      const res = await fetch("/api/investments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.id) {
        setInvestments((prev) => [...prev, { id: data.id, ...body, is_active: 1, is_paid: false, paid_amount: null, patterns: [] }]);
        setAddOpen(false);
        form.reset();
      }
    } catch (err) { console.error("[investments] Add error:", err); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editFormRef.current) return;
    const fd = new FormData(editFormRef.current);
    const body = {
      id: editTarget.id,
      name: fd.get("name") as string,
      monthly_amount: parseFloat((fd.get("monthly_amount") as string).replace(",", ".")),
      expected_day: parseInt(fd.get("expected_day") as string, 10) || 1,
      expected_return: parseFloat((fd.get("expected_return") as string).replace(",", ".")) || 7,
      current_value: parseFloat((fd.get("current_value") as string || "0").replace(",", ".")) || 0,
    };
    console.info("[investments] Editing:", body.id);
    try {
      await fetch("/api/investments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setInvestments((prev) => prev.map((i) => i.id === body.id ? {
        ...i,
        name: body.name,
        monthly_amount: body.monthly_amount,
        expected_day: body.expected_day,
        expected_return: body.expected_return,
        current_value: body.current_value,
      } : i));
      setEditOpen(false);
      setEditTarget(null);
    } catch (err) { console.error("[investments] Edit error:", err); }
  };

  const toggleInvestment = async (id: number, currentActive: number) => {
    const newActive = currentActive ? 0 : 1;
    setInvestments((prev) => prev.map((i) => i.id === id ? { ...i, is_active: newActive } : i));
    try {
      await fetch("/api/investments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, is_active: newActive }) });
    } catch (err) { console.error("[investments] Toggle error:", err); }
  };

  const deleteInvestment = async (id: number) => {
    console.info("[investments] Deleting:", id);
    try {
      await fetch("/api/investments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setInvestments((prev) => prev.filter((i) => i.id !== id));
    } catch (err) { console.error("[investments] Delete error:", err); }
  };

  const active = investments.filter((i) => i.is_active);
  const totalMonthly = active.reduce((s, i) => s + i.monthly_amount, 0);
  const totalCurrentValue = active.reduce((s, i) => s + i.current_value, 0);

  // Weighted average return for projection
  const weightedReturn = totalMonthly > 0
    ? active.reduce((s, i) => s + i.expected_return * i.monthly_amount, 0) / totalMonthly
    : 7;

  const projection = calculateProjection(totalCurrentValue, totalMonthly, weightedReturn, projectionYears);

  if (loading) {
    return <div className="page-loading"><Loader2 className="page-loading-spinner animate-spin" /></div>;
  }

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">{t.investments.title}</h1>
          <p className="page-subtitle">{t.investments.subtitle}</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="icon-sm" />
            {t.investments.addInvestment}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.investments.addInvestmentTitle}</DialogTitle></DialogHeader>
            <form ref={addFormRef} onSubmit={handleAdd} className="form-stack">
              <div className="form-field">
                <Label>{t.investments.name}</Label>
                <Input name="name" placeholder={t.investments.namePlaceholder} required />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>{t.investments.monthlyAmount}</Label>
                  <Input name="monthly_amount" type="text" inputMode="decimal" placeholder="0.00" required />
                </div>
                <div className="form-field">
                  <Label>{t.investments.expectedDay}</Label>
                  <Input name="expected_day" type="number" min="1" max="31" defaultValue="1" required />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>{t.investments.expectedReturn}</Label>
                  <Input name="expected_return" type="text" inputMode="decimal" defaultValue="7" />
                </div>
                <div className="form-field">
                  <Label>{t.investments.currentValue}</Label>
                  <Input name="current_value" type="text" inputMode="decimal" placeholder="0.00" />
                </div>
              </div>
              <Button type="submit">{t.investments.addInvestment}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="page-grid-3-sm">
        <Card className="metric-card">
          <div className="metric-card-row">
            <div className="metric-card-icon" data-color="primary">
              <Wallet />
            </div>
            <div>
              <p className="metric-card-label">{t.investments.totalMonthly}</p>
              <p className="metric-card-value">{totalMonthly.toFixed(2)} €</p>
            </div>
          </div>
        </Card>
        <Card className="metric-card">
          <div className="metric-card-row">
            <div className="metric-card-icon" data-color="positive">
              <TrendingUp />
            </div>
            <div>
              <p className="metric-card-label">{t.investments.totalValue}</p>
              <p className="metric-card-value">{totalCurrentValue.toFixed(2)} €</p>
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
              <p className="metric-card-value">{projection.finalValue.toLocaleString("fi-FI")} €</p>
              <p className="metric-card-note">{projectionYears} {locale === "fi" ? "v" : "y"} @ {weightedReturn.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Investment list */}
      {investments.length > 0 && (
        <Card className="list-card list-card-divider">
          {[...investments].sort((a, b) => a.expected_day - b.expected_day).map((inv) => (
            <div
              key={inv.id}
              className="list-item"
              onClick={() => { setEditTarget(inv); setEditOpen(true); }}
            >
              <div className="list-item-body">
                <div className="list-item-name-row">
                  <p className={`list-item-name ${!inv.is_active ? "is-inactive" : ""}`}>{inv.name}</p>
                  {inv.is_paid && <Badge className="badge-matched"><Check className="icon-xs" />{locale === "fi" ? "Siirretty" : "Transferred"}</Badge>}
                </div>
                <p className="list-item-meta">
                  {t.investments.transfersTo} {inv.expected_day}.
                  {" · "}{inv.expected_return}% {locale === "fi" ? "tuotto" : "return"}
                  {inv.current_value > 0 && ` · ${locale === "fi" ? "arvo" : "value"} ${inv.current_value.toFixed(0)} €`}
                  {inv.patterns.length > 0 && (
                    <span className="list-item-patterns"> – {inv.patterns.join(", ")}</span>
                  )}
                </p>
              </div>
              <div className="list-item-end">
                <p className="list-item-amount-value">{inv.monthly_amount.toFixed(2)} €</p>
                <span onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={!!inv.is_active}
                    onCheckedChange={() => toggleInvestment(inv.id, inv.is_active)}
                  />
                </span>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Projection chart */}
      {active.length > 0 && (
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
                <span className="payoff-stats-value" data-color="positive">{projection.finalValue.toLocaleString("fi-FI")} €</span>
              </div>
              <div>
                <span className="payoff-stats-label">{t.investments.invested} </span>
                <span className="payoff-stats-value">{projection.totalInvested.toLocaleString("fi-FI")} €</span>
              </div>
              <div>
                <span className="payoff-stats-label">{t.investments.returns} </span>
                <span className="payoff-stats-value" data-color="positive">+{projection.totalReturns.toLocaleString("fi-FI")} €</span>
              </div>
            </div>
            {projection.timeline.length > 1 && (
              <ChartContainer height={250}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projection.timeline} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
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
                    <XAxis
                      dataKey="year"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}${locale === "fi" ? "v" : "y"}`}
                    />
                    <YAxis
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M €` : `${Math.round(v / 1000)}k €`}
                      width={55}
                    />
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="chart-tooltip">
                            <p className="chart-tooltip-label">{label} {locale === "fi" ? "vuotta" : "years"}</p>
                            <p className="chart-tooltip-value text-positive">{Number(payload[0].value).toLocaleString("fi-FI")} €</p>
                            <p className="chart-tooltip-value text-foreground">{locale === "fi" ? "Sijoitettu" : "Invested"}: {Number(payload[1].value).toLocaleString("fi-FI")} €</p>
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

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{locale === "fi" ? "Muokkaa sijoitusta" : "Edit investment"}</DialogTitle></DialogHeader>
          {editTarget && (
            <form ref={editFormRef} onSubmit={handleEdit} className="form-stack">
              <div className="form-field">
                <Label>{t.investments.name}</Label>
                <Input name="name" defaultValue={editTarget.name} required />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>{t.investments.monthlyAmount}</Label>
                  <Input name="monthly_amount" type="text" inputMode="decimal" defaultValue={editTarget.monthly_amount} required />
                </div>
                <div className="form-field">
                  <Label>{t.investments.expectedDay}</Label>
                  <Input name="expected_day" type="number" min="1" max="31" defaultValue={editTarget.expected_day} required />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>{t.investments.expectedReturn}</Label>
                  <Input name="expected_return" type="text" inputMode="decimal" defaultValue={editTarget.expected_return} />
                </div>
                <div className="form-field">
                  <Label>{t.investments.currentValue}</Label>
                  <Input name="current_value" type="text" inputMode="decimal" defaultValue={editTarget.current_value} />
                </div>
              </div>
              <div className="form-grid-2">
                <Button type="button" variant="destructive" onClick={() => { deleteInvestment(editTarget.id); setEditOpen(false); }}>
                  {t.common.delete}
                </Button>
                <Button type="submit">{t.common.save}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
