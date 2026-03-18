"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { RefreshCw, Sparkles, Copy, Check } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

export function AiSummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { locale } = useLocale();

  const fetchSummary = async (refresh = false) => {
    console.debug("[ai-summary] Fetching summary, refresh:", refresh);
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({ locale });
      if (refresh) params.set("refresh", "1");
      const url = `/api/summary?${params}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.summary) {
        console.info("[ai-summary] Got summary, cached:", data.cached);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("[ai-summary] Failed to fetch:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [locale]);

  if (loading && !summary) return null;
  if (!summary) return null;

  return (
    <Card className="ai-summary-card">
      <div className="ai-summary-header">
        <div className="ai-summary-icon">
          <Sparkles />
        </div>
        <div className="ai-summary-actions">
          <button
            className="ai-summary-refresh"
            onClick={() => {
              if (summary) {
                navigator.clipboard.writeText(summary);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
            aria-label="Copy summary"
          >
            {copied ? <Check /> : <Copy />}
          </button>
          <button
            className="ai-summary-refresh"
            onClick={() => fetchSummary(true)}
            disabled={refreshing}
            aria-label="Refresh summary"
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      <p className="ai-summary-text">{summary}</p>
    </Card>
  );
}
