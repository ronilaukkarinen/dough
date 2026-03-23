import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const SELIGSON_BASE = "https://www.seligson.fi/suomi/rahastot";

// Seligson fund slug mapping — users set ticker to "SELIGSON:brands" etc.
const SELIGSON_FUNDS: Record<string, { slug: string; name: string }> = {
  brands: { slug: "rahes_brands", name: "Seligson Global Top 25 Brands" },
  suomi: { slug: "rahes_suomi", name: "Seligson Finland Index" },
  phoebus: { slug: "rahes_phoebus", name: "Seligson Phoebus" },
  pharos: { slug: "rahes_pharos", name: "Seligson Pharos" },
  eurooppa: { slug: "rahes_eurooppa", name: "Seligson Eurooppa" },
  pohjoismaat: { slug: "rahes_pohjoismaat", name: "Seligson Pohjoismaat" },
  pharma: { slug: "rahes_pharma", name: "Seligson Pharma" },
  aasia: { slug: "rahes_aasia", name: "Seligson Aasia" },
  perhe: { slug: "rahes_perhe", name: "Seligson Family Business" },
};

async function fetchSeligson(fundKey: string): Promise<TickerData | null> {
  const fund = SELIGSON_FUNDS[fundKey.toLowerCase()];
  if (!fund) {
    console.warn("[ticker] Unknown Seligson fund:", fundKey);
    return null;
  }

  console.info("[ticker] Scraping Seligson", fund.name);
  try {
    const res = await fetch(`${SELIGSON_BASE}/${fund.slug}.htm`, {
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Parse NAV from: <td data-label="Kasvu (A)">18,059 €</td>
    const navMatch = html.match(/data-label="Kasvu \(A\)">([\d,]+)\s*€/);
    if (!navMatch) {
      console.warn("[ticker] Could not parse Seligson NAV for", fund.name);
      return null;
    }
    const price = parseFloat(navMatch[1].replace(",", "."));

    // Parse daily change: <td data-label="1 pv"><span class="down">-1,26 %</span></td>
    const changeMatch = html.match(/data-label="1 pv"><span class="(?:up|down)">([-\d,]+)\s*%/);
    const dayChangePct = changeMatch ? parseFloat(changeMatch[1].replace(",", ".")) : 0;
    const previousClose = dayChangePct !== 0 ? price / (1 + dayChangePct / 100) : price;

    console.info("[ticker] Seligson", fund.name, "NAV:", price, "change:", dayChangePct + "%");

    return {
      symbol: `SELIGSON:${fundKey.toUpperCase()}`,
      name: fund.name,
      price,
      previousClose: Math.round(previousClose * 1000) / 1000,
      currency: "EUR",
      dayChangePct,
      week52High: 0,
      week52Low: 0,
      sparkline: [],
    };
  } catch (err) {
    console.error("[ticker] Seligson scrape error:", err);
    return null;
  }
}

interface TickerData {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  currency: string;
  dayChangePct: number;
  week52High: number;
  week52Low: number;
  sparkline: number[];
}

async function fetchTicker(symbol: string): Promise<TickerData | null> {
  console.info("[ticker] Fetching", symbol, "from Yahoo Finance");
  try {
    const res = await fetch(`${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?range=1y&interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn("[ticker] Yahoo Finance returned", res.status, "for", symbol);
      return null;
    }

    const data = await res.json();
    const result0 = data?.chart?.result?.[0];
    const meta = result0?.meta;
    if (!meta) {
      console.warn("[ticker] No meta data for", symbol);
      return null;
    }

    const price = meta.regularMarketPrice ?? 0;

    // Extract historical close prices for sparkline
    const closes: number[] = (result0?.indicators?.quote?.[0]?.close ?? []).filter((v: number | null) => v != null);
    const sparkline = closes;

    // Daily change: compare current price to second-to-last close (yesterday)
    const yesterdayClose = closes.length >= 2 ? closes[closes.length - 2] : price;
    const dayChangePct = yesterdayClose > 0 ? ((price - yesterdayClose) / yesterdayClose) * 100 : 0;

    const tickerResult: TickerData = {
      symbol: meta.symbol || symbol,
      name: meta.shortName || meta.longName || symbol,
      price,
      previousClose: yesterdayClose,
      currency: meta.currency || "USD",
      dayChangePct: Math.round(dayChangePct * 100) / 100,
      week52High: meta.fiftyTwoWeekHigh ?? 0,
      week52Low: meta.fiftyTwoWeekLow ?? 0,
      sparkline,
    };

    console.info("[ticker] Fetched", symbol, "price:", price, "change:", tickerResult.dayChangePct + "%", "sparkline:", sparkline.length, "points");
    return tickerResult;
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
        day_change_pct: number; week_52_high: number; week_52_low: number; sparkline_json: string; updated_at: string;
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
            sparkline: JSON.parse(cached.sparkline_json || "[]"),
          };
          continue;
        }
      }
      toFetch.push(sym);
    }

    // Fetch missing/stale tickers
    if (toFetch.length > 0) {
      console.info("[ticker] Fetching", toFetch.length, "tickers:", toFetch.join(", "));
      const fetched = await Promise.all(toFetch.map((sym) => {
        if (sym.startsWith("SELIGSON:")) return fetchSeligson(sym.split(":")[1].toLowerCase());
        return fetchTicker(sym);
      }));

      const upsert = db.prepare(`
        INSERT INTO ticker_cache (symbol, name, price, previous_close, currency, day_change_pct, week_52_high, week_52_low, sparkline_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(symbol) DO UPDATE SET name=excluded.name, price=excluded.price, previous_close=excluded.previous_close,
          currency=excluded.currency, day_change_pct=excluded.day_change_pct, week_52_high=excluded.week_52_high,
          week_52_low=excluded.week_52_low, sparkline_json=excluded.sparkline_json, updated_at=datetime('now')
      `);

      for (let i = 0; i < toFetch.length; i++) {
        const data = fetched[i];
        if (data) {
          result[toFetch[i]] = data;
          try {
            upsert.run(data.symbol, data.name, data.price, data.previousClose, data.currency, data.dayChangePct, data.week52High, data.week52Low, JSON.stringify(data.sparkline));
          } catch (cacheErr) {
            console.warn("[ticker] Cache write failed for", toFetch[i], cacheErr);
          }
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
