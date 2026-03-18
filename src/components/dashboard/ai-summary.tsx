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
    try {
      navigator.clipboard.writeText(summary).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      // Fallback for Safari
      const textarea = document.createElement("textarea");
      textarea.value = summary;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = () => {
    console.info("[ai-summary] Refresh clicked");
    fetchSummary(true);
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
          <div className="skeleton-line" style={{ width: "92%" }} />
          <div className="skeleton-line" style={{ width: "78%" }} />
          <div className="skeleton-line" style={{ width: "85%" }} />
        </div>
      ) : summary ? (
        <p className="ai-summary-text">{summary}</p>
      ) : null}
    </Card>
  );
}
