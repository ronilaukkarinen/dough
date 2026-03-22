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
import { Plus, Loader2, Check, AlertCircle } from "lucide-react";
import { F } from "@/components/ui/f";

// Known brand configs
const BRANDS: Record<string, { color: string; logo: string; svg?: string }> = {
  netflix: { color: "#E50914", logo: "N", svg: "netflix" },
  spotify: { color: "#1DB954", logo: "S", svg: "spotify" },
  disney: { color: "#113CCF", logo: "D+" },
  "hbo max": { color: "#5822B4", logo: "H" },
  "apple tv": { color: "#000000", logo: "" },
  "apple music": { color: "#FC3C44", logo: "♪" },
  "youtube premium": { color: "#FF0000", logo: "▶" },
  "youtube music": { color: "#FF0000", logo: "♪" },
  "amazon prime": { color: "#00A8E1", logo: "P" },
  "xbox game pass": { color: "#107C10", logo: "X" },
  "playstation plus": { color: "#003087", logo: "PS" },
  "nintendo switch online": { color: "#E60012", logo: "N" },
  adobe: { color: "#FF0000", logo: "Ai" },
  figma: { color: "#A259FF", logo: "F" },
  notion: { color: "#000000", logo: "N" },
  slack: { color: "#4A154B", logo: "S" },
  github: { color: "#24292F", logo: "GH" },
  dropbox: { color: "#0061FF", logo: "D" },
  "1password": { color: "#0572EC", logo: "1P" },
  nordvpn: { color: "#4687FF", logo: "N" },
  claude: { color: "#cc785c", logo: "A", svg: "anthropic" },
  anthropic: { color: "#cc785c", logo: "A", svg: "anthropic" },
  icloud: { color: "#3693F3", logo: "", svg: "icloud" },
  "apple icloud": { color: "#3693F3", logo: "", svg: "icloud" },
  "ultra.cc": { color: "#14b89f", logo: "U", svg: "ultracc" },
  ultra: { color: "#14b89f", logo: "U", svg: "ultracc" },
  elisa: { color: "#009bdb", logo: "E" },
  telia: { color: "#990AE3", logo: "T" },
  dna: { color: "#00A651", logo: "D" },
};

function getBrandConfig(name: string): { color: string; logo: string; svg?: string } {
  const lower = name.toLowerCase();
  for (const [key, config] of Object.entries(BRANDS)) {
    if (lower.includes(key)) return config;
  }
  return { color: "#6366f1", logo: name.charAt(0).toUpperCase() };
}

function BrandIcon({ svg, logo }: { svg?: string; logo: string }) {
  if (svg === "netflix") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff">
        <path d="m5.398 0 8.348 23.602c2.346.059 4.856.398 4.856.398L10.113 0H5.398zm8.489 0v9.172l4.715 13.33V0h-4.715zM5.398 1.5V24c1.873-.225 2.81-.312 4.715-.398V14.83L5.398 1.5z"/>
      </svg>
    );
  }
  if (svg === "spotify") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    );
  }
  if (svg === "anthropic") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff">
        <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z"/>
      </svg>
    );
  }
  if (svg === "ultracc") {
    return (
      <svg viewBox="0 0 52 60" width="20" height="20" fill="#fff">
        <path d="m0 15 26-15 9.14 5.26-26 15z" opacity=".5"/>
        <path d="m0 45v-30l9.14 5.26v19.46l16.86 9.74v10.54z"/>
        <path d="m26 60v-10.54l26-15v10.54z" opacity=".75"/>
        <path d="m42.86 20.26-16.86 9.74v14l16.86-9.7z" opacity=".5"/>
        <path d="m42.86 20.26v14l9.14-5.26v-14z" opacity=".75"/>
        <path d="m30.7 13.24-16.86 9.76 12.16 7 16.86-9.74z" opacity=".35"/>
        <path d="m39.82 8-9.14 5.26 12.18 7 9.14-5.26z" opacity=".5"/>
      </svg>
    );
  }
  if (svg === "icloud") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff">
        <path d="M13.762 4.29a6.51 6.51 0 0 0-5.669 3.332 3.571 3.571 0 0 0-1.558-.36 3.571 3.571 0 0 0-3.516 3A4.918 4.918 0 0 0 0 14.796a4.918 4.918 0 0 0 4.92 4.914 4.93 4.93 0 0 0 .617-.045h14.42c2.305-.272 4.041-2.258 4.043-4.589v-.009a4.594 4.594 0 0 0-3.727-4.508 6.51 6.51 0 0 0-6.511-6.27z"/>
      </svg>
    );
  }
  return <span>{logo}</span>;
}

interface Subscription {
  id: number;
  name: string;
  amount: number;
  due_day: number;
  brand_color: string;
  brand_logo: string;
  brand_svg?: string;
  is_active: number;
  is_paid: boolean;
  is_overdue: boolean;
  patterns: string[];
}

export default function SubscriptionsPage() {
  const { locale } = useLocale();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Subscription | null>(null);
  const [newPattern, setNewPattern] = useState("");
  const addFormRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  const loadSubscriptions = useCallback(() => {
    console.debug("[subscriptions] Loading");
    fetch("/api/subscriptions")
      .then((r) => r.json())
      .then((data) => {
        if (data.subscriptions) {
          console.info("[subscriptions] Loaded", data.subscriptions.length);
          setSubscriptions(data.subscriptions);
        }
      })
      .catch((err) => console.error("[subscriptions] Load error:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSubscriptions(); }, [loadSubscriptions]);
  useEvent("data:updated", useCallback(() => { loadSubscriptions(); }, [loadSubscriptions]));
  useEvent("sync:complete", useCallback(() => { loadSubscriptions(); }, [loadSubscriptions]));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = addFormRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const name = fd.get("name") as string;
    const brand = getBrandConfig(name);
    const body = {
      name,
      amount: parseFloat((fd.get("amount") as string).replace(",", ".")),
      due_day: parseInt(fd.get("due_day") as string, 10),
      brand_color: brand.color,
      brand_logo: brand.logo,
    };
    console.info("[subscriptions] Adding:", body.name);
    try {
      const res = await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if ((await res.json()).id) {
        setAddOpen(false);
        form.reset();
        loadSubscriptions();
      }
    } catch (err) { console.error("[subscriptions] Add error:", err); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editFormRef.current) return;
    const fd = new FormData(editFormRef.current);
    const name = fd.get("name") as string;
    const brand = getBrandConfig(name);
    const body = {
      id: editTarget.id,
      name,
      amount: parseFloat((fd.get("amount") as string).replace(",", ".")),
      due_day: parseInt(fd.get("due_day") as string, 10),
      brand_color: brand.color,
      brand_logo: brand.logo,
    };
    console.info("[subscriptions] Editing:", body.id);
    try {
      await fetch("/api/subscriptions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setEditOpen(false);
      setEditTarget(null);
      loadSubscriptions();
    } catch (err) { console.error("[subscriptions] Edit error:", err); }
  };

  const toggleSub = async (id: number, currentActive: number) => {
    setSubscriptions((prev) => prev.map((s) => s.id === id ? { ...s, is_active: currentActive ? 0 : 1 } : s));
    try {
      await fetch("/api/subscriptions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, is_active: !currentActive }) });
    } catch (err) { console.error("[subscriptions] Toggle error:", err); }
  };

  const deleteSub = async (id: number) => {
    console.info("[subscriptions] Deleting:", id);
    try {
      await fetch("/api/subscriptions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) { console.error("[subscriptions] Delete error:", err); }
  };

  const togglePaid = async (subId: number, currentPaid: boolean) => {
    try {
      await fetch("/api/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subId, mark_paid: !currentPaid }),
      });
      loadSubscriptions();
    } catch (err) { console.error("[subscriptions] Toggle paid error:", err); }
  };

  const addPattern = async (subId: number) => {
    if (!newPattern.trim()) return;
    try {
      await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_type: "subscription", source_id: subId, payee_pattern: newPattern.trim() }),
      });
      setNewPattern("");
      loadSubscriptions();
    } catch (err) { console.error("[subscriptions] Add pattern error:", err); }
  };

  const active = subscriptions.filter((s) => s.is_active);
  const monthlyTotal = active.reduce((s, sub) => s + sub.amount, 0);
  const yearlyTotal = monthlyTotal * 12;

  if (loading) {
    return <div className="page-loading"><Loader2 className="page-loading-spinner animate-spin" /></div>;
  }

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">{locale === "fi" ? "Kausitilaukset" : "Subscriptions"}</h1>
          <p className="page-subtitle">{locale === "fi" ? "Toistuvat tilaus- ja jäsenmaksut" : "Recurring subscription and membership fees"}</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="icon-sm" />
            {locale === "fi" ? "Lisää tilaus" : "Add subscription"}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{locale === "fi" ? "Lisää kausitilaus" : "Add subscription"}</DialogTitle></DialogHeader>
            <form ref={addFormRef} onSubmit={handleAdd} className="form-stack">
              <div className="form-field">
                <Label>{locale === "fi" ? "Nimi" : "Name"}</Label>
                <Input name="name" placeholder={locale === "fi" ? "esim. Netflix" : "e.g. Netflix"} required autoComplete="off" />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>{locale === "fi" ? "Summa (€)" : "Amount (€)"}</Label>
                  <Input name="amount" type="text" inputMode="decimal" placeholder="0.00" required autoComplete="off" />
                </div>
                <div className="form-field">
                  <Label>{locale === "fi" ? "Veloituspäivä" : "Billing day"}</Label>
                  <Input name="due_day" type="number" min="1" max="31" placeholder="1" required autoComplete="off" />
                </div>
              </div>
              <Button type="submit">{locale === "fi" ? "Lisää tilaus" : "Add subscription"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="page-grid-2-sm">
        <Card className="metric-card">
          <p className="metric-card-label">{locale === "fi" ? "Kuukaudessa" : "Monthly"}</p>
          <p className="metric-card-value-3xl text-negative"><F v={monthlyTotal} /></p>
          <p className="metric-card-note metric-card-note-mt">{active.length} {locale === "fi" ? "tilausta" : "subscriptions"}</p>
        </Card>
        <Card className="metric-card">
          <p className="metric-card-label">{locale === "fi" ? "Vuodessa" : "Yearly"}</p>
          <p className="metric-card-value-3xl text-negative"><F v={yearlyTotal} /></p>
        </Card>
      </div>

      {subscriptions.length > 0 && (
        <div className="subscription-grid">
          {[...subscriptions].sort((a, b) => a.due_day - b.due_day).map((sub) => (
            <div
              key={sub.id}
              className="subscription-card"
              style={{ backgroundColor: sub.brand_color + "1a", borderColor: sub.brand_color + "33" }}
              onClick={() => { setEditTarget(sub); setEditOpen(true); }}
            >
              <div className="subscription-card-header">
                <div className="subscription-brand-icon" style={{ backgroundColor: sub.brand_color }}>
                  <BrandIcon svg={getBrandConfig(sub.name).svg} logo={sub.brand_logo || sub.name.charAt(0)} />
                </div>
                <div className="subscription-card-info">
                  <div className="list-item-name-row">
                    <p className={`subscription-card-name ${!sub.is_active ? "is-inactive" : ""}`}>{sub.name}</p>
                    {sub.is_paid && <Badge className="badge-matched"><Check className="icon-xs" />{locale === "fi" ? "Maksettu" : "Paid"}</Badge>}
                    {sub.is_overdue && <Badge variant="destructive">{locale === "fi" ? "Myöhässä" : "Overdue"}</Badge>}
                  </div>
                  <p className="subscription-card-meta">
                    {locale === "fi" ? "Veloitus" : "Billing"} {sub.due_day}. {locale === "fi" ? "päivä" : ""}
                    {sub.patterns.length > 0 && <span className="list-item-patterns"> – {sub.patterns.join(", ")}</span>}
                  </p>
                </div>
                <div className="subscription-card-right">
                  <p className="subscription-card-amount"><F v={sub.amount} /></p>
                </div>
              </div>
              <span className="subscription-toggle" onClick={(e) => e.stopPropagation()}>
                <Switch checked={!!sub.is_active} onCheckedChange={() => toggleSub(sub.id, sub.is_active)} />
              </span>
            </div>
          ))}
        </div>
      )}

      {subscriptions.length === 0 && (
        <p className="page-subtitle">{locale === "fi" ? "Ei vielä tilauksia. Lisää ensimmäinen!" : "No subscriptions yet. Add your first one!"}</p>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{locale === "fi" ? "Muokkaa tilausta" : "Edit subscription"}</DialogTitle></DialogHeader>
          {editTarget && (
            <form ref={editFormRef} onSubmit={handleEdit} className="form-stack">
              <div className="form-field">
                <Label>{locale === "fi" ? "Nimi" : "Name"}</Label>
                <Input name="name" defaultValue={editTarget.name} required autoComplete="off" />
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <Label>{locale === "fi" ? "Summa (€)" : "Amount (€)"}</Label>
                  <Input name="amount" type="text" inputMode="decimal" defaultValue={editTarget.amount} required autoComplete="off" />
                </div>
                <div className="form-field">
                  <Label>{locale === "fi" ? "Veloituspäivä" : "Billing day"}</Label>
                  <Input name="due_day" type="number" min="1" max="31" defaultValue={editTarget.due_day} required autoComplete="off" />
                </div>
              </div>
              <div className="form-field">
                <Label>{locale === "fi" ? "Yhdistä maksajaan" : "Match payee"}</Label>
                <div className="match-pattern-row">
                  <Input
                    value={newPattern}
                    onChange={(e) => setNewPattern(e.target.value)}
                    placeholder={locale === "fi" ? "esim. *Netflix*" : "e.g. *Netflix*"}
                    className="match-pattern-input"
                    autoComplete="off"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => addPattern(editTarget.id)}>{locale === "fi" ? "Lisää" : "Add"}</Button>
                </div>
                {editTarget.patterns.length > 0 && (
                  <div className="match-pattern-list">
                    {editTarget.patterns.map((p, i) => (
                      <span key={i} className="match-pattern-tag">{p}</span>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant={editTarget.is_paid ? "outline" : "secondary"}
                size="sm"
                onClick={() => { togglePaid(editTarget.id, editTarget.is_paid); setEditOpen(false); }}
              >
                {editTarget.is_paid
                  ? (locale === "fi" ? "Merkitse maksamattomaksi" : "Mark unpaid")
                  : (locale === "fi" ? "Merkitse maksetuksi" : "Mark paid")}
              </Button>
              <div className="form-grid-2">
                <Button type="button" variant="destructive" onClick={() => { deleteSub(editTarget.id); setEditOpen(false); }}>
                  {locale === "fi" ? "Poista" : "Delete"}
                </Button>
                <Button type="submit">{locale === "fi" ? "Tallenna" : "Save"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
