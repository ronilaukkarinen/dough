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
import { RefreshCw, CheckCircle2, XCircle, Globe, User, Link } from "lucide-react";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("Roni");
  const [language, setLanguage] = useState("en");
  const [ynabConnected] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Profile */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-muted-foreground" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="max-w-xs bg-background/50 border-border/50"
              />
            </div>
            <Button size="sm">Save</Button>
          </CardContent>
        </Card>

        {/* Language */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Language
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
              <SelectTrigger className="max-w-xs bg-background/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fi">Suomi</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* YNAB Integration */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link className="h-4 w-4 text-muted-foreground" />
              YNAB Integration
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
                  <Label>YNAB Personal Access Token</Label>
                  <Input
                    type="password"
                    placeholder="Paste your token here"
                    className="max-w-md bg-background/50 border-border/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your token from YNAB Settings → Developer Settings
                  </p>
                </div>
                <Button size="sm">Connect</Button>
              </div>
            )}

            {ynabConnected && (
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-3 w-3" />
                  Sync now
                </Button>
                <span className="text-xs text-muted-foreground">
                  Last sync: 5 minutes ago
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
