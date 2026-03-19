"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { RefreshCw, Sparkles, Copy, Check } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import ReactMarkdown from "react-markdown";
import { copyToClipboard } from "@/lib/clipboard";

export function AiSummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { locale } = useLocale();

  const fetchSummary = (refresh = false) => {
    console.info("[ai-summary] Fetching summary, refresh:", refresh);
    if (refresh) {
      setRefreshing(true);
      setSummary(null);
    } else {
      setLoading(true);
    }

    const params = new URLSearchParams({ locale });
    if (refresh) params.set("refresh", "1");

    fetch(`/api/summary?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.summary) {
          console.info("[ai-summary] Got summary, cached:", data.cached);
          setSummary(data.summary);
        }
      })
      .catch((err) => console.error("[ai-summary] Failed:", err))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchSummary();
  }, [locale]);

  const handleCopy = () => {
    if (!summary) return;
    console.info("[ai-summary] Copying to clipboard");
    copyToClipboard(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRefresh = () => {
    console.info("[ai-summary] Refresh clicked");
    setRefreshing(true);
    setSummary(null);
    // Small delay so skeleton is visible even on fast cached responses
    setTimeout(() => fetchSummary(true), 300);
  };

  if (!loading && !summary && !refreshing) return null;

  return (
    <Card className="ai-summary-card">
      <div className="ai-summary-header">
        <div className="ai-summary-icon">
          <Sparkles />
        </div>
        <div className="ai-summary-actions">
          {summary && (
            <button
              type="button"
              className="ai-summary-refresh"
              onClick={handleCopy}
            >
              {copied ? <Check /> : <Copy />}
            </button>
          )}
          <button
            type="button"
            className="ai-summary-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      {refreshing || (loading && !summary) ? (
        <div className="skeleton-lines">
          <div className="skeleton-line skeleton-line-wide" />
          <div className="skeleton-line skeleton-line-medium" />
          <div className="skeleton-line skeleton-line-narrow" />
        </div>
      ) : summary ? (
        <div className="ai-summary-text"><ReactMarkdown>{summary}</ReactMarkdown></div>
      ) : null}
    </Card>
  );
}
