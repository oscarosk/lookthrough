// Validate the parts of CoinMarketCap responses we rely on.
// Unknown or missing fields become null instead of crashing the page.
// Handles both v2 shapes (quote.USD object, data keyed by id) and v3 shapes
// (quote as an array of currency objects, data as an array).
import { z } from "zod";
import type { CoinRef, Quote, VolumeHistory } from "./types";

const num = z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v === null || v === undefined || v === "" ? null : Number(v)));

const UsdQuote = z.object({
  price: num,
  volume_24h: num,
  cex_volume_24h: num,
  dex_volume_24h: num,
  percent_change_24h: num,
  market_cap: num,
  last_updated: z.string().nullable().optional(),
});
type UsdQuote = z.infer<typeof UsdQuote>;

const QuoteEntry = z.object({
  id: z.number(),
  name: z.string(),
  symbol: z.string(),
  quote: z.unknown(),
});

const MapEntry = z.object({
  id: z.number(),
  name: z.string(),
  symbol: z.string(),
  slug: z.string(),
  rank: z.number().nullable().optional(),
});

/** The USD quote, whether CMC sent `{ USD: {...} }` (v2) or `[{ symbol: "USD", ... }]` (v3). */
export function usdQuote(quote: unknown): UsdQuote | null {
  let raw: unknown = null;
  if (Array.isArray(quote)) {
    raw = quote.find((q) => q && typeof q === "object" && ((q as { symbol?: string }).symbol === "USD" || (q as { id?: number }).id === 2781)) ?? null;
  } else if (quote && typeof quote === "object") {
    raw = (quote as Record<string, unknown>).USD ?? null;
  }
  const parsed = UsdQuote.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Entries from `data`, whether an array (v3) or an object keyed by id or symbol (v2). */
function entries(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  return Object.values(data as Record<string, unknown>).flatMap((v) => (Array.isArray(v) ? v : [v]));
}

export function parseQuotes(data: unknown): Quote[] {
  const out: Quote[] = [];
  for (const raw of entries(data)) {
    const parsed = QuoteEntry.safeParse(raw);
    if (!parsed.success) continue;
    const q = parsed.data;
    const usd = usdQuote(q.quote);
    out.push({
      id: q.id,
      symbol: q.symbol,
      name: q.name,
      price: usd?.price ?? null,
      volume24h: usd?.volume_24h ?? null,
      cexVolume24h: usd?.cex_volume_24h ?? null,
      dexVolume24h: usd?.dex_volume_24h ?? null,
      percentChange24h: usd?.percent_change_24h ?? null,
      marketCap: usd?.market_cap ?? null,
      lastUpdated: usd?.last_updated ?? null,
    });
  }
  return out;
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Median daily volume per id from /v3/cryptocurrency/quotes/historical. */
export function parseHistory(data: unknown): Record<number, VolumeHistory> {
  const out: Record<number, VolumeHistory> = {};
  for (const raw of entries(data)) {
    const e = raw as { id?: number; quotes?: { quote?: unknown }[] } | null;
    if (!e || typeof e.id !== "number" || !Array.isArray(e.quotes)) continue;
    const vols = e.quotes.map((q) => usdQuote(q?.quote)?.volume_24h).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    out[e.id] = { medianVolume: median(vols), days: vols.length };
  }
  return out;
}

export function parseMap(data: unknown): CoinRef[] {
  if (!Array.isArray(data)) return [];
  const out: CoinRef[] = [];
  for (const raw of data) {
    const parsed = MapEntry.safeParse(raw);
    if (!parsed.success) continue;
    const m = parsed.data;
    out.push({ id: m.id, name: m.name, symbol: m.symbol, slug: m.slug, rank: m.rank ?? null });
  }
  return out;
}

/** Among coins sharing a symbol, prefer the best (lowest) CMC rank. */
export function pickBest(candidates: CoinRef[]): CoinRef | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))[0];
}

export interface TokenInfo {
  /** Main blockchain the token is issued on; null for native coins (BTC, ETH…). */
  chain: string | null;
  logo: string | null;
  /** CoinMarketCap's notice about a significant event affecting the token, as plain text. */
  notice: string | null;
}

function plainText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
  if (!text) return null;
  return text.length > 280 ? `${text.slice(0, 277)}…` : text;
}

/** Chain (`platform.name`) and logo per id from /v2/cryptocurrency/info. */
export function parseInfo(data: unknown): Record<number, TokenInfo> {
  const out: Record<number, TokenInfo> = {};
  for (const raw of entries(data)) {
    const e = raw as { id?: unknown; platform?: { name?: unknown } | null; logo?: unknown; notice?: unknown } | null;
    if (!e || typeof e.id !== "number") continue;
    out[e.id] = {
      chain: e.platform && typeof e.platform.name === "string" ? e.platform.name : null,
      logo: typeof e.logo === "string" && e.logo.startsWith("https://") ? e.logo : null,
      notice: plainText(e.notice),
    };
  }
  return out;
}

/** USD price from /v2/tools/price-conversion (an object when asked by id, an array by symbol). */
export function parseConversionPrice(data: unknown): number | null {
  const first = Array.isArray(data) ? data[0] : data;
  return usdQuote((first as { quote?: unknown } | null)?.quote)?.price ?? null;
}
