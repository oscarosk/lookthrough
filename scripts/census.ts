// The census: how easy is it to actually sell a tokenised real-world asset?
// Reads every RWA asset with tokens, then every token's 24h volume.
// Writes data/census.json (shown in the app) and docs/CENSUS.md.
//
// Uses /v5/real-world-assets/assets/list and /v5/real-world-assets/quotes/latest.
// Run: npm run census   (about 40 credits)
import { mkdirSync, writeFileSync } from "node:fs";
import { cmcFetch } from "../lib/cmc-core";
import { DERIVATIVES_ISSUER, normalizeIssuer, parseRwaQuotes } from "../lib/rwa";
import type { RwaAsset } from "../lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const POSITION = 5000; // a modest retail position, in USD
const PACE = 0.1; // share of daily volume you can sell without moving the price
const THIN = POSITION / PACE; // below this daily volume, $5k takes over a day

interface ListRow { rwa_id: number; has_tokens: boolean; rwa_rank: number | null }

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

async function main() {
  const key = process.env.CMC_API_KEY;
  if (!key) throw new Error("Set CMC_API_KEY in .env.local first");
  let credits = 0;

  // 1. Every RWA asset, 250 per page.
  const rows: ListRow[] = [];
  for (let start = 1; ; ) {
    const page = await cmcFetch("/v5/real-world-assets/assets/list", { start: String(start), limit: "250" }, key);
    credits += page.status.credit_count;
    const data = page.data as { rwa_assets?: ListRow[]; has_more?: boolean };
    const got = data?.rwa_assets ?? [];
    rows.push(...got);
    if (!data?.has_more || got.length === 0) break;
    start += got.length;
    await sleep(150);
  }
  const rank = new Map(rows.map((r) => [r.rwa_id, r.rwa_rank ?? Infinity]));
  const withTokens = rows.filter((r) => r.has_tokens).map((r) => r.rwa_id);
  console.log(`${rows.length} RWA assets, ${withTokens.length} with tokens`);

  // 2. Tokens and volumes for every asset that has tokens, 100 assets per call.
  const assets: RwaAsset[] = [];
  for (let i = 0; i < withTokens.length; i += 100) {
    const ids = withTokens.slice(i, i + 100).join(",");
    const page = await cmcFetch("/v5/real-world-assets/quotes/latest", { rwa_id: ids, skip_invalid: "true" }, key);
    credits += page.status.credit_count;
    assets.push(...parseRwaQuotes(page.data));
    await sleep(150);
  }

  // 3. Measure. Derivative "tokens" are left out: they are not claims on the asset.
  const tokens = assets.flatMap((a) =>
    a.tokens.filter((t) => t.issuerName !== DERIVATIVES_ISSUER).map((t) => ({ ...t, asset: a })),
  );
  const noMarket = tokens.filter((t) => t.price === null || !t.volume24h);
  const traded = tokens.filter((t) => t.price !== null && (t.volume24h ?? 0) > 0);
  const thin = tokens.filter((t) => (t.volume24h ?? 0) < THIN);
  const under1k = traded.filter((t) => (t.volume24h as number) < 1000);

  // Same asset, several wrappers: how different is their liquidity?
  const multi = assets
    .map((a) => ({ a, vols: a.tokens.filter((t) => t.issuerName !== DERIVATIVES_ISSUER && (t.volume24h ?? 0) > 0).map((t) => t.volume24h as number) }))
    .filter((x) => x.vols.length >= 2);
  const ratios = multi.map((x) => Math.max(...x.vols) / Math.min(...x.vols));
  const tenX = ratios.filter((r) => r >= 10).length;

  // By issuer.
  const byIssuer = new Map<string, { tokens: number; noMarket: number; thin: number }>();
  for (const t of tokens) {
    const k = normalizeIssuer(t.issuerName ?? "Unknown");
    const row = byIssuer.get(k) ?? { tokens: 0, noMarket: 0, thin: 0 };
    row.tokens += 1;
    if (t.price === null || !t.volume24h) row.noMarket += 1;
    if ((t.volume24h ?? 0) < THIN) row.thin += 1;
    byIssuer.set(k, row);
  }
  const issuers = [...byIssuer.entries()]
    .map(([name, r]) => ({ name, ...r, thinShare: pct(r.thin, r.tokens) }))
    .sort((a, b) => b.tokens - a.tokens);

  // A well-known stock whose token trades thinly, for the sample portfolio.
  const sample = traded
    .filter((t) => t.asset.assetType === "stock" && (t.volume24h as number) >= 3000 && (t.volume24h as number) <= 40000 && (rank.get(t.asset.rwaId) ?? Infinity) <= 150)
    .sort((a, b) => (rank.get(a.asset.rwaId) ?? Infinity) - (rank.get(b.asset.rwaId) ?? Infinity))[0];

  const census = {
    generatedAt: new Date().toISOString(),
    positionUsd: POSITION,
    pace: PACE,
    assets: rows.length,
    assetsWithTokens: withTokens.length,
    tokens: tokens.length,
    noMarket: noMarket.length,
    noMarketShare: pct(noMarket.length, tokens.length),
    thin: thin.length,
    thinShare: pct(thin.length, tokens.length),
    under1k: under1k.length,
    medianTradedVolume: median(traded.map((t) => t.volume24h as number)),
    multiWrapperAssets: multi.length,
    tenXGapAssets: tenX,
    issuers,
        headline: `Only ${pct(tokens.length - thin.length, tokens.length)}% of the ${tokens.length.toLocaleString("en-US")} tokenised real-world asset tokens on CoinMarketCap trade enough to sell a $${POSITION.toLocaleString("en-US")} position within a day. ${pct(noMarket.length, tokens.length)}% show no trading volume at all.`,
    sample: sample
      ? { cryptoId: sample.cryptoId, symbol: sample.symbol, name: sample.name, underlying: sample.asset.name, volume24h: sample.volume24h, price: sample.price }
      : null,
    credits,
  };

  writeFileSync("data/census.json", JSON.stringify(census, null, 2) + "\n");
  mkdirSync("docs", { recursive: true });
  writeFileSync(
    "docs/CENSUS.md",
    [
      `# Census: can you actually sell a tokenised real-world asset?`,
      ``,
      `Measured ${census.generatedAt} from the CoinMarketCap RWA API.`,
      ``,
      `**${census.headline}**`,
      ``,
      `- RWA assets tracked: ${census.assets.toLocaleString("en-US")}, of which ${census.assetsWithTokens} have at least one token`,
      `- Tokens (excluding derivatives): ${census.tokens}`,
      `- No price or no 24h volume at all: ${census.noMarket} (${census.noMarketShare}%)`,
      `- Under $${THIN.toLocaleString("en-US")}/day, so $${POSITION.toLocaleString("en-US")} takes over a day to sell at ${PACE * 100}% of volume: ${census.thin} (${census.thinShare}%)`,
      `- Median 24h volume of tokens that do trade: $${Math.round(census.medianTradedVolume ?? 0).toLocaleString("en-US")}`,
      `- Assets with 2+ traded tokens: ${census.multiWrapperAssets}; in ${census.tenXGapAssets} of them the busiest token trades 10× more than the quietest`,
      ``,
      `| Issuer | Tokens | No market | Thin (< $${THIN.toLocaleString("en-US")}/day) |`,
      `|---|---:|---:|---:|`,
      ...issuers.map((i) => `| ${i.name} | ${i.tokens} | ${i.noMarket} | ${i.thin} (${i.thinShare}%) |`),
      ``,
      `Method: see scripts/census.ts. Credits used: ${credits}.`,
      ``,
    ].join("\n"),
  );

  console.log(`\n${census.headline}`);
  console.log(`No market: ${census.noMarket}/${census.tokens}. Assets with a 10× wrapper gap: ${tenX}/${multi.length}.`);
  console.log(sample ? `Sample thin token: ${sample.symbol} (${sample.name}), $${Math.round(sample.volume24h as number)}/day` : "No sample thin token found");
  console.log(`Credits used: ${credits}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
