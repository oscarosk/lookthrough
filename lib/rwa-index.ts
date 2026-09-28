// crypto_id → (rwa_id, issuer), built from CoinMarketCap's issuer endpoints by
// `npm run rwa-index` and committed, so a lookup costs no credits at runtime.
import index from "@/data/rwa-index.json";

export interface RwaIndexFile {
  generatedAt: string | null;
  /** issuer_id → issuer name */
  issuers: Record<string, string>;
  /** crypto_id → [rwa_id, issuer_id] */
  tokens: Record<string, [number, string]>;
}

const INDEX = index as unknown as RwaIndexFile;

export function rwaLink(cryptoId: number): { rwaId: number; issuerName: string } | null {
  const hit = INDEX.tokens[String(cryptoId)];
  if (!hit) return null;
  return { rwaId: hit[0], issuerName: INDEX.issuers[hit[1]] ?? "Unknown issuer" };
}

export function rwaIndexInfo() {
  return { generatedAt: INDEX.generatedAt, tokens: Object.keys(INDEX.tokens).length, issuers: Object.keys(INDEX.issuers).length };
}
