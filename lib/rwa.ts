// Parsing and helpers for CoinMarketCap's /v5/real-world-assets endpoints.
import { z } from "zod";
import type { RwaAsset, RwaToken } from "./types";

const n = z.union([z.number(), z.string()]).nullable().optional().transform((v) => (v === null || v === undefined || v === "" ? null : Number(v)));

const Token = z.object({
  crypto_id: z.number(),
  symbol: z.string(),
  name: z.string(),
  issuer_name: z.string().nullable().optional(),
  price: n,
  volume_24h: n,
  market_cap: n,
});

const Asset = z.object({
  rwa_id: z.number(),
  name: z.string(),
  symbol: z.string(),
  asset_type: z.string().nullable().optional(),
  average_tokenized_price: n,
  tokenized_volume_24h: n,
  tokens: z.array(z.unknown()).nullable().optional(),
});

/** Issuers whose "tokens" are derivatives, not redeemable claims on the asset. */
export const DERIVATIVES_ISSUER = "NA (Derivatives)";

export function parseRwaQuotes(data: unknown): RwaAsset[] {
  const list = (data as { rwa_assets?: unknown[] } | null)?.rwa_assets;
  if (!Array.isArray(list)) return [];
  const out: RwaAsset[] = [];
  for (const raw of list) {
    const a = Asset.safeParse(raw);
    if (!a.success) continue;
    const tokens: RwaToken[] = [];
    for (const t of a.data.tokens ?? []) {
      const p = Token.safeParse(t);
      if (!p.success) continue;
      tokens.push({
        cryptoId: p.data.crypto_id,
        symbol: p.data.symbol,
        name: p.data.name,
        issuerName: p.data.issuer_name ?? null,
        price: p.data.price,
        volume24h: p.data.volume_24h,
        marketCap: p.data.market_cap,
      });
    }
    out.push({
      rwaId: a.data.rwa_id,
      name: a.data.name,
      symbol: a.data.symbol,
      assetType: a.data.asset_type ?? "unknown",
      averageTokenizedPrice: a.data.average_tokenized_price,
      tokenizedVolume24h: a.data.tokenized_volume_24h,
      tokens,
    });
  }
  return out;
}

/** "Backed Assets" → "Backed", "Tether Holdings" → "Tether". */
export function normalizeIssuer(name: string): string {
  if (name === DERIVATIVES_ISSUER) return "No issuer (derivative)";
  return name.replace(/\s+Assets$/i, "").replace(/\s+Holdings$/i, "").trim();
}

export interface WrapperInsight {
  /** A more heavily traded token for the same underlying asset, if any. */
  busier: RwaToken | null;
  busierRatio: number | null;
  /** Your token's price relative to the average of all tokens for this asset. */
  priceGap: number | null;
  tokenCount: number;
}

/** Compare the token you hold with the other tokens for the same asset. */
export function compareWrappers(asset: RwaAsset, cryptoId: number, myPrice: number | null, myVolume: number | null): WrapperInsight {
  const real = asset.tokens.filter((t) => t.issuerName !== DERIVATIVES_ISSUER);
  const others = real.filter((t) => t.cryptoId !== cryptoId && (t.volume24h ?? 0) > 0);
  const busiest = others.sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))[0] ?? null;
  const mine = Math.max(myVolume ?? 0, 1);
  const ratio = busiest ? (busiest.volume24h as number) / mine : null;
  const avg = asset.averageTokenizedPrice;
  return {
    busier: busiest && ratio !== null && ratio >= 3 ? busiest : null,
    busierRatio: ratio,
    priceGap: avg && myPrice ? myPrice / avg - 1 : null,
    tokenCount: real.length,
  };
}
