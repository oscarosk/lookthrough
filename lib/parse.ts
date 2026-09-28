// Validate the parts of CoinMarketCap responses we rely on.
// Unknown or missing fields become null instead of crashing the page.
import { z } from "zod";
import type { CoinRef, Quote } from "./types";

const num = z.number().nullable().optional();

const UsdQuote = z.object({
  price: num,
  volume_24h: num,
  percent_change_24h: num,
  market_cap: num,
  last_updated: z.string().nullable().optional(),
});

const QuoteEntry = z.object({
  id: z.number(),
  name: z.string(),
  symbol: z.string(),
  quote: z.object({ USD: UsdQuote.optional() }).partial(),
});

const MapEntry = z.object({
  id: z.number(),
  name: z.string(),
  symbol: z.string(),
  slug: z.string(),
  rank: z.number().nullable().optional(),
});

export function parseQuotes(data: unknown): Quote[] {
  if (!data || typeof data !== "object") return [];
  const out: Quote[] = [];
  for (const value of Object.values(data as Record<string, unknown>)) {
    // Keyed by id → one object. Keyed by symbol → an array of objects.
    const entries = Array.isArray(value) ? value : [value];
    for (const raw of entries) {
      const parsed = QuoteEntry.safeParse(raw);
      if (!parsed.success) continue;
      const q = parsed.data;
      const usd = q.quote.USD;
      out.push({
        id: q.id,
        symbol: q.symbol,
        name: q.name,
        price: usd?.price ?? null,
        volume24h: usd?.volume_24h ?? null,
        percentChange24h: usd?.percent_change_24h ?? null,
        marketCap: usd?.market_cap ?? null,
        lastUpdated: usd?.last_updated ?? null,
      });
    }
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
