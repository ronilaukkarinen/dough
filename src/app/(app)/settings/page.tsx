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
import { RefreshCw, CheckCircle2, XCircle, Globe, Link, Loader2, PiggyBank, Users } from "lucide-react";
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
  const [savingRate, setSavingRate] = useState("");
  const [savingRateSaved, setSavingRateSaved] = useState(false);
  const [householdProfile, setHouseholdProfile] = useState("");
  const [householdSaved, setHouseholdSaved] = useState(false);
  const { t, locale, setLocale } = useLocale();

  useEffect(() => {
    console.debug("[settings] Loading settings");
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/household").then((r) => r.json()),
    ])
      .then(([userData, householdData]) => {
        if (userData.user) {
          setProfile({
            ...userData.user,
            ynab_connected: householdData.settings?.ynab_connected || false,
            ynab_budget_id: householdData.settings?.ynab_budget_id || null,
            last_ynab_sync: householdData.settings?.last_ynab_sync || null,
          });
          setLanguage(userData.user.locale || "en");
          if (householdData.settings?.ynab_budget_id) {
            setYnabBudgetId(householdData.settings.ynab_budget_id);
          }
          if (householdData.settings?.saving_rate) {
            setSavingRate(String(householdData.settings.saving_rate));
          }
          if (householdData.settings?.household_profile) {
            setHouseholdProfile(householdData.settings.household_profile);
          }
          if (householdData.settings?.ynab_connected) {
            fetch("/api/ynab/budgets")
              .then((r) => r.json())
              .then((bd) => {
                if (bd.budgets?.length) setYnabBudgets(bd.budgets);
              })
              .catch(() => {});
          }
        }
      })
      .catch((err) => console.error("[settings] Failed to load:", err))
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
      // Save token to household settings
      const res = await fetch("/api/household", {
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
        await fetch("/api/household", {
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
      const res = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ynab_access_token: null,
          ynab_budget_id: null,
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
      const res = await fetch("/api/household", {
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

        {/* Household profile */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <Users />
              {locale === "fi" ? "Talouden tiedot" : "Household details"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="form-field">
              <Label>{locale === "fi" ? "Kuvaus AI-neuvontaa varten" : "Description for AI advisor"}</Label>
              <textarea
                className="input settings-textarea"
                value={householdProfile}
                onChange={(e) => setHouseholdProfile(e.target.value)}
                placeholder={locale === "fi"
                  ? "Esim. perhe: 2 aikuista ja 2 lasta (Lotta 16v, Manu 12v). Asumme vuokralla Jyv\u00e4skyl\u00e4ss\u00e4."
                  : "E.g. Family: 2 adults and 2 kids (Lotta 16, Manu 12). We rent in Jyv\u00e4skyl\u00e4."}
                rows={3}
              />
              <div className="settings-row">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    console.info("[settings] Saving household profile");
                    await fetch("/api/household", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ household_profile: householdProfile }),
                    });
                    setHouseholdSaved(true);
                    setTimeout(() => setHouseholdSaved(false), 2000);
                  }}
                >
                  {t.common.save}
                </Button>
                {householdSaved && <span className="settings-saved">{t.common.saved}</span>}
              </div>
              <p className="settings-help">
                {locale === "fi"
                  ? "AI-neuvoja k\u00e4ytt\u00e4\u00e4 t\u00e4t\u00e4 antaessaan r\u00e4\u00e4t\u00e4l\u00f6ityj\u00e4 neuvoja"
                  : "The AI advisor uses this to give tailored advice"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Saving rate */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <PiggyBank />
              {locale === "fi" ? "Säästötavoite" : "Saving goal"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="form-field">
              <Label>{locale === "fi" ? "Kuukausittainen säästötavoite (€)" : "Monthly saving goal (€)"}</Label>
              <div className="settings-row">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={savingRate}
                  onChange={(e) => setSavingRate(e.target.value)}
                  placeholder="0"
                  className="settings-input"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    console.info("[settings] Saving saving rate:", savingRate);
                    await fetch("/api/household", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ saving_rate: savingRate || "0" }),
                    });
                    setSavingRateSaved(true);
                    setTimeout(() => setSavingRateSaved(false), 2000);
                  }}
                >
                  {t.common.save}
                </Button>
                {savingRateSaved && (
                  <span className="settings-saved">{t.common.saved}</span>
                )}
              </div>
              <p className="settings-help">
                {locale === "fi"
                  ? "Vähennetään käytettävissä olevasta saldosta ennen päiväbudjetin laskemista"
                  : "Deducted from available balance before calculating daily budget"}
              </p>
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
                    <span className="settings-sync-time">{t.common.loading}</span>
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
