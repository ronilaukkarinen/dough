import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface TickerData {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  currency: string;
  dayChangePct: number;
  week52High: number;
  week52Low: number;
}

async function fetchTicker(symbol: string): Promise<TickerData | null> {
  console.info("[ticker] Fetching", symbol, "from Yahoo Finance");
  try {
    const res = await fetch(`${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?range=5d&interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn("[ticker] Yahoo Finance returned", res.status, "for", symbol);
      return null;
    }

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) {
      console.warn("[ticker] No meta data for", symbol);
      return null;
    }

    const price = meta.regularMarketPrice ?? 0;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const dayChangePct = previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0;

    const result: TickerData = {
      symbol: meta.symbol || symbol,
      name: meta.shortName || meta.longName || symbol,
      price,
      previousClose,
      currency: meta.currency || "USD",
      dayChangePct: Math.round(dayChangePct * 100) / 100,
      week52High: meta.fiftyTwoWeekHigh ?? 0,
      week52Low: meta.fiftyTwoWeekLow ?? 0,
    };

    console.info("[ticker] Fetched", symbol, "price:", price, "change:", result.dayChangePct + "%");
    return result;
  } catch (err) {
    console.error("[ticker] Fetch error for", symbol, err);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const url = new URL(request.url);
    const symbols = url.searchParams.get("symbols");
    if (!symbols) return NextResponse.json({ error: "symbols param required" }, { status: 400 });

    const symbolList = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (symbolList.length === 0) return NextResponse.json({ tickers: {} });

    const db = getDb();
    const result: Record<string, TickerData> = {};
    const toFetch: string[] = [];

    // Check cache first
    for (const sym of symbolList) {
      const cached = db.prepare("SELECT * FROM ticker_cache WHERE symbol = ?").get(sym) as {
        symbol: string; name: string; price: number; previous_close: number; currency: string;
        day_change_pct: number; week_52_high: number; week_52_low: number; updated_at: string;
      } | undefined;

      if (cached) {
        const age = Date.now() - new Date(cached.updated_at).getTime();
        if (age < CACHE_TTL_MS) {
          console.debug("[ticker] Cache hit for", sym, "age:", Math.round(age / 1000) + "s");
          result[sym] = {
            symbol: cached.symbol,
            name: cached.name,
            price: cached.price,
            previousClose: cached.previous_close,
            currency: cached.currency,
            dayChangePct: cached.day_change_pct,
            week52High: cached.week_52_high,
            week52Low: cached.week_52_low,
          };
          continue;
        }
      }
      toFetch.push(sym);
    }

    // Fetch missing/stale tickers
    if (toFetch.length > 0) {
      console.info("[ticker] Fetching", toFetch.length, "tickers:", toFetch.join(", "));
      const fetched = await Promise.all(toFetch.map((sym) => fetchTicker(sym)));

      const upsert = db.prepare(`
        INSERT INTO ticker_cache (symbol, name, price, previous_close, currency, day_change_pct, week_52_high, week_52_low, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(symbol) DO UPDATE SET name=excluded.name, price=excluded.price, previous_close=excluded.previous_close,
          currency=excluded.currency, day_change_pct=excluded.day_change_pct, week_52_high=excluded.week_52_high,
          week_52_low=excluded.week_52_low, updated_at=datetime('now')
      `);

      for (let i = 0; i < toFetch.length; i++) {
        const data = fetched[i];
        if (data) {
          upsert.run(data.symbol, data.name, data.price, data.previousClose, data.currency, data.dayChangePct, data.week52High, data.week52Low);
          result[toFetch[i]] = data;
        }
      }
    }

    console.debug("[ticker] Returning", Object.keys(result).length, "tickers");
    return NextResponse.json({ tickers: result });
  } catch (error) {
    console.error("[ticker] Error:", error);
    return NextResponse.json({ error: "Failed to fetch ticker data" }, { status: 500 });
  }
}
