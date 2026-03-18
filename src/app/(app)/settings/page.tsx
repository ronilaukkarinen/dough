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
  const [ynabLoading, setYnabLoading] = useState(false);
  const [ynabError, setYnabError] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState("");
  const [langSaved, setLangSaved] = useState(false);

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
    setYnabLoading(true);
    setYnabError("");
    console.info("[settings] Connecting YNAB");

    try {
      const res = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ynab_access_token: ynabToken.trim() }),
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your preferences
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Language */}
        <Card className="border-border/50 bg-card/80 gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Language
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Select value={language} onValueChange={(v) => v && handleLanguageChange(v)}>
                <SelectTrigger className="max-w-xs bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fi">Suomi</SelectItem>
                </SelectContent>
              </Select>
              {langSaved && (
                <span className="text-xs text-positive">Saved</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* YNAB Integration */}
        <Card className="border-border/50 bg-card/80 gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link className="h-4 w-4 text-muted-foreground" />
              YNAB integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Status:</span>
              {profile?.ynab_connected ? (
                <Badge className="gap-1 bg-positive/10 text-positive border-0">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Not connected
                </Badge>
              )}
            </div>

            {!profile?.ynab_connected && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect your YNAB account to sync transactions, budgets, and account balances.
                </p>
                <div className="space-y-2">
                  <Label>YNAB personal access token</Label>
                  <Input
                    type="password"
                    placeholder="Paste your token here"
                    value={ynabToken}
                    onChange={(e) => setYnabToken(e.target.value)}
                    className="max-w-md bg-background/50 border-border/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your token from YNAB settings, developer settings
                  </p>
                </div>
                {ynabError && <p className="text-sm text-destructive">{ynabError}</p>}
                <Button size="sm" onClick={handleYnabConnect} disabled={ynabLoading}>
                  {ynabLoading ? "Connecting..." : "Connect"}
                </Button>
              </div>
            )}

            {profile?.ynab_connected && (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleSync}
                  disabled={syncLoading}
                >
                  <RefreshCw className={`h-3 w-3 ${syncLoading ? "animate-spin" : ""}`} />
                  {syncLoading ? "Syncing..." : "Sync now"}
                </Button>
                <span className="text-xs text-muted-foreground">
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
