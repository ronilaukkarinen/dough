"use client";

import { useState } from "react";
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
import { RefreshCw, CheckCircle2, XCircle, Globe, Link } from "lucide-react";

export default function SettingsPage() {
  const [language, setLanguage] = useState("en");
  const [ynabToken, setYnabToken] = useState("");
  const [ynabConnected, setYnabConnected] = useState(false);
  const [ynabLoading, setYnabLoading] = useState(false);
  const [ynabError, setYnabError] = useState("");
  const [langSaved, setLangSaved] = useState(false);

  const handleLanguageChange = async (value: string) => {
    setLanguage(value);
    try {
      await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: value }),
      });
      setLangSaved(true);
      setTimeout(() => setLangSaved(false), 2000);
    } catch {
      console.error("[settings] Failed to save language");
    }
  };

  const handleYnabConnect = async () => {
    if (!ynabToken.trim()) {
      setYnabError("Token is required");
      return;
    }
    setYnabLoading(true);
    setYnabError("");

    try {
      const res = await fetch("/api/auth/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ynab_access_token: ynabToken.trim() }),
      });

      if (!res.ok) {
        setYnabError("Failed to save token");
      } else {
        setYnabConnected(true);
        setYnabToken("");
      }
    } catch {
      setYnabError("Connection error");
    } finally {
      setYnabLoading(false);
    }
  };

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
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
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
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link className="h-4 w-4 text-muted-foreground" />
              YNAB integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Status:</span>
              {ynabConnected ? (
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

            {!ynabConnected && (
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

            {ynabConnected && (
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-3 w-3" />
                  Sync now
                </Button>
                <span className="text-xs text-muted-foreground">
                  Last sync: never
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
