"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, XCircle, Globe, Link, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n";

interface UserProfile {
  id: number;
  email: string;
  locale: string;
  ynab_connected: boolean;
  ynab_budget_id: string | null;
  last_ynab_sync: string | null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("en");
  const [ynabToken, setYnabToken] = useState("");
  const [ynabBudgetId, setYnabBudgetId] = useState("");
  const [ynabLoading, setYnabLoading] = useState(false);
  const [ynabError, setYnabError] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState("");
  const [langSaved, setLangSaved] = useState(false);
  const [ynabBudgets, setYnabBudgets] = useState<{ id: string; name: string }[]>([]);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const { t, setLocale } = useLocale();

  useEffect(() => {
    console.debug("[settings] Loading user profile");
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          console.info("[settings] Profile loaded for", data.user.email);
          setProfile(data.user);
          setLanguage(data.user.locale || "en");
          if (data.user.ynab_budget_id) {
            setYnabBudgetId(data.user.ynab_budget_id);
          }
          // Fetch available budgets if connected
          if (data.user.ynab_connected) {
            fetch("/api/ynab/budgets")
              .then((r) => r.json())
              .then((bd) => {
                if (bd.budgets?.length) setYnabBudgets(bd.budgets);
              })
              .catch(() => {});
          }
        }
      })
      .catch((err) => console.error("[settings] Failed to load profile:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleLanguageChange = async (value: string) => {
    setLanguage(value);
    setLocale(value as Locale);
    console.info("[settings] Saving language:", value);
    try {
      const res = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: value }),
      });
      if (res.ok) {
        setLangSaved(true);
        setTimeout(() => setLangSaved(false), 2000);
        console.info("[settings] Language saved:", value);
      } else {
        console.error("[settings] Failed to save language");
      }
    } catch (err) {
      console.error("[settings] Language save error:", err);
    }
  };

  const fetchBudgets = async () => {
    setBudgetsLoading(true);
    try {
      const res = await fetch("/api/ynab/budgets");
      const data = await res.json();
      if (data.budgets?.length) {
        setYnabBudgets(data.budgets);
        return data.budgets as { id: string; name: string }[];
      }
    } catch (err) {
      console.error("[settings] Failed to fetch budgets:", err);
    } finally {
      setBudgetsLoading(false);
    }
    return [];
  };

  const handleYnabConnect = async () => {
    if (!ynabToken.trim()) {
      setYnabError("Token required");
      return;
    }
    setYnabLoading(true);
    setYnabError("");
    console.info("[settings] Connecting YNAB");

    try {
      // Save token first
      const res = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ynab_access_token: ynabToken.trim() }),
      });

      if (!res.ok) {
        setYnabError("Failed to save token");
        console.error("[settings] YNAB token save failed");
        return;
      }

      setProfile((prev) => prev ? { ...prev, ynab_connected: true } : prev);
      setYnabToken("");
      console.info("[settings] YNAB token saved");

      // Fetch budgets and auto-select first one
      const budgets = await fetchBudgets();
      if (budgets.length > 0) {
        const firstBudget = budgets[0];
        setYnabBudgetId(firstBudget.id);
        await fetch("/api/auth/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ynab_budget_id: firstBudget.id }),
        });
        setProfile((prev) => prev ? { ...prev, ynab_budget_id: firstBudget.id } : prev);
        console.info("[settings] Auto-selected budget:", firstBudget.name);
      }
    } catch (err) {
      setYnabError("Connection error");
      console.error("[settings] YNAB connect error:", err);
    } finally {
      setYnabLoading(false);
    }
  };

  const handleYnabDisconnect = async () => {
    setYnabLoading(true);
    console.info("[settings] Disconnecting YNAB");
    try {
      const res = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ynab_access_token: "",
          ynab_budget_id: "",
        }),
      });
      if (res.ok) {
        setProfile((prev) => prev ? { ...prev, ynab_connected: false, ynab_budget_id: null } : prev);
        setYnabToken("");
        setYnabBudgetId("");
        console.info("[settings] YNAB disconnected");
      }
    } catch (err) {
      console.error("[settings] YNAB disconnect error:", err);
    } finally {
      setYnabLoading(false);
    }
  };

  const handleBudgetIdSave = async (budgetId?: string) => {
    const id = budgetId || ynabBudgetId;
    if (!id.trim()) return;
    console.info("[settings] Saving budget ID:", id);
    try {
      const res = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ynab_budget_id: id.trim() }),
      });
      if (res.ok) {
        setProfile((prev) => prev ? { ...prev, ynab_budget_id: id.trim() } : prev);
        console.info("[settings] Budget ID saved");
      }
    } catch (err) {
      console.error("[settings] Budget ID save error:", err);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    setSyncResult("");
    console.info("[settings] Starting YNAB sync");

    try {
      const res = await fetch("/api/ynab/sync", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setSyncResult("Sync complete");
        setProfile((prev) => prev ? { ...prev, last_ynab_sync: new Date().toISOString() } : prev);
        console.info("[settings] YNAB sync complete");
      } else {
        setSyncResult(data.error || "Sync failed");
        console.error("[settings] YNAB sync failed:", data.error);
      }
    } catch (err) {
      setSyncResult("Connection error");
      console.error("[settings] YNAB sync error:", err);
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncResult(""), 5000);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="page-loading-spinner animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div>
        <h1 className="page-heading">{t.settings.title}</h1>
        <p className="page-subtitle">{t.settings.subtitle}</p>
      </div>

      <div className="settings-grid">
        {/* Language */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <Globe />
              {t.settings.language}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-row">
              <Select value={language} onValueChange={(v) => v && handleLanguageChange(v)}>
                <SelectTrigger className="settings-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fi">Suomi</SelectItem>
                </SelectContent>
              </Select>
              {langSaved && (
                <span className="settings-saved">{t.common.saved}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* YNAB Integration */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <Link />
              {t.settings.ynab}
            </CardTitle>
          </CardHeader>
          <CardContent className="form-stack">
            <div className="settings-row">
              <span className="settings-status">{t.common.status}:</span>
              {profile?.ynab_connected ? (
                <Badge className="badge-connected">
                  <CheckCircle2 />
                  {t.settings.ynabConnected}
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle />
                  {t.settings.ynabDisconnected}
                </Badge>
              )}
            </div>

            {!profile?.ynab_connected ? (
              <div className="form-stack">
                <p className="page-subtitle">
                  {t.settings.ynabDescription}
                </p>
                <div className="form-field">
                  <Label>{t.settings.ynabToken}</Label>
                  <Input
                    type="password"
                    placeholder={t.settings.ynabTokenPlaceholder}
                    value={ynabToken}
                    onChange={(e) => setYnabToken(e.target.value)}
                    className="settings-input"
                  />
                  <p className="settings-help">
                    {t.settings.ynabTokenHelp}
                  </p>
                </div>
                <div className="form-field">
                  <Label>{t.settings.ynabBudgetId}</Label>
                  <Input
                    type="text"
                    placeholder={t.settings.ynabBudgetIdPlaceholder}
                    value={ynabBudgetId}
                    onChange={(e) => setYnabBudgetId(e.target.value)}
                    className="settings-input"
                  />
                  <p className="settings-help">
                    {t.settings.ynabBudgetIdHelp}
                  </p>
                </div>
                {ynabError && <p className="settings-error">{ynabError}</p>}
                <Button size="sm" onClick={handleYnabConnect} disabled={ynabLoading}>
                  {ynabLoading ? t.common.connecting : t.common.connect}
                </Button>
              </div>
            ) : (
              <div className="form-stack">
                <div className="form-field">
                  <Label>{t.settings.budget}</Label>
                  {ynabBudgets.length > 0 ? (
                    <Select
                      value={ynabBudgetId}
                      onValueChange={(v) => {
                        if (v) {
                          setYnabBudgetId(v);
                          handleBudgetIdSave(v);
                        }
                      }}
                    >
                      <SelectTrigger className="settings-input">
                        <SelectValue placeholder={t.settings.selectBudget} />
                      </SelectTrigger>
                      <SelectContent>
                        {ynabBudgets.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="settings-row">
                      <Input
                        type="text"
                        placeholder={t.settings.budgetId}
                        value={ynabBudgetId}
                        onChange={(e) => setYnabBudgetId(e.target.value)}
                        className="settings-input"
                      />
                      <Button size="sm" variant="outline" onClick={() => handleBudgetIdSave()}>
                        {t.common.save}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => fetchBudgets()} disabled={budgetsLoading}>
                        {budgetsLoading ? t.common.loading : t.settings.fetch}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="settings-row">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={syncLoading}
                  >
                    <RefreshCw className={`sync-icon ${syncLoading ? "animate-spin" : ""}`} />
                    {syncLoading ? t.settings.syncing : t.settings.syncNow}
                  </Button>
                  <span className="settings-sync-time">
                    {syncResult || (profile.last_ynab_sync
                      ? `${t.settings.lastSync}: ${new Date(profile.last_ynab_sync).toLocaleDateString("fi-FI")}`
                      : t.common.neverSynced)}
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleYnabDisconnect}
                  disabled={ynabLoading}
                >
                  {ynabLoading ? t.common.disconnecting : t.settings.disconnectYnab}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
