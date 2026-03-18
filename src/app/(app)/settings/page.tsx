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
  const { setLocale } = useLocale();

  useEffect(() => {
    console.debug("[settings] Loading user profile");
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          console.info("[settings] Profile loaded for", data.user.email);
          setProfile(data.user);
          setLanguage(data.user.locale || "en");
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

  const handleYnabConnect = async () => {
    if (!ynabToken.trim()) {
      setYnabError("Token is required");
      return;
    }
    if (!ynabBudgetId.trim()) {
      setYnabError("Budget ID is required");
      return;
    }
    setYnabLoading(true);
    setYnabError("");
    console.info("[settings] Connecting YNAB");

    try {
      const res = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ynab_access_token: ynabToken.trim(),
          ynab_budget_id: ynabBudgetId.trim(),
        }),
      });

      if (!res.ok) {
        setYnabError("Failed to save token");
        console.error("[settings] YNAB token save failed");
      } else {
        setProfile((prev) => prev ? { ...prev, ynab_connected: true } : prev);
        setYnabToken("");
        console.info("[settings] YNAB connected");
      }
    } catch (err) {
      setYnabError("Connection error");
      console.error("[settings] YNAB connect error:", err);
    } finally {
      setYnabLoading(false);
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
        <h1 className="page-heading">Settings</h1>
        <p className="page-subtitle">Manage your preferences</p>
      </div>

      <div className="settings-grid">
        {/* Language */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <Globe />
              Language
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
                <span className="settings-saved">Saved</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* YNAB Integration */}
        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <Link />
              YNAB integration
            </CardTitle>
          </CardHeader>
          <CardContent className="form-stack">
            <div className="settings-row">
              <span className="settings-status">Status:</span>
              {profile?.ynab_connected ? (
                <Badge className="badge-connected">
                  <CheckCircle2 />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle />
                  Not connected
                </Badge>
              )}
            </div>

            {!profile?.ynab_connected && (
              <div className="form-stack">
                <p className="page-subtitle">
                  Connect your YNAB account to sync transactions, budgets, and account balances.
                </p>
                <div className="form-field">
                  <Label>YNAB personal access token</Label>
                  <Input
                    type="password"
                    placeholder="Paste your token here"
                    value={ynabToken}
                    onChange={(e) => setYnabToken(e.target.value)}
                    className="settings-input"
                  />
                  <p className="settings-help">
                    Get your token from YNAB settings, developer settings
                  </p>
                </div>
                <div className="form-field">
                  <Label>YNAB budget ID</Label>
                  <Input
                    type="text"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={ynabBudgetId}
                    onChange={(e) => setYnabBudgetId(e.target.value)}
                    className="settings-input"
                  />
                  <p className="settings-help">
                    The UUID from your YNAB URL when viewing the budget
                  </p>
                </div>
                {ynabError && <p className="settings-error">{ynabError}</p>}
                <Button size="sm" onClick={handleYnabConnect} disabled={ynabLoading}>
                  {ynabLoading ? "Connecting..." : "Connect"}
                </Button>
              </div>
            )}

            {profile?.ynab_connected && (
              <div className="settings-row">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncLoading}
                >
                  <RefreshCw className={syncLoading ? "animate-spin" : ""} style={{ width: "0.75rem", height: "0.75rem" }} />
                  {syncLoading ? "Syncing..." : "Sync now"}
                </Button>
                <span className="settings-sync-time">
                  {syncResult || (profile.last_ynab_sync
                    ? `Last sync: ${new Date(profile.last_ynab_sync).toLocaleDateString("fi-FI")}`
                    : "Never synced")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
