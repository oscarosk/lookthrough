// Saves real CoinMarketCap responses for the sample portfolio into
// data/snapshots.json. The app serves these, clearly labelled, only when a
// live call fails (for example after the hackathon key reverts to Basic).
//
// Run after rwa-index and census: npm run snapshot
import { writeFileSync } from "node:fs";
import { cacheKey, cmcFetch, type CmcResponse } from "../lib/cmc-core";
import { parseMap, pickBest } from "../lib/parse";
import { rwaLink } from "../lib/rwa-index";
import { sampleExtras, sampleSymbols } from "../lib/sample";

async function main() {
  const apiKey = process.env.CMC_API_KEY;
  if (!apiKey) throw new Error("Set CMC_API_KEY in .env.local first");
  const out: Record<string, CmcResponse> = {};

  // Same params /api/resolve builds for the sample button.
  const symbols = sampleSymbols();
  const mapParams = { symbol: symbols.join(",") };
  const map = await cmcFetch("/v1/cryptocurrency/map", mapParams, apiKey);
  out[cacheKey("/v1/cryptocurrency/map", mapParams)] = map;

  const coins = parseMap(map.data);
  const ids = [
    ...symbols.map((s) => pickBest(coins.filter((c) => c.symbol.toUpperCase() === s))?.id),
    ...sampleExtras().map((e) => e.cryptoId),
  ]
    .filter((id): id is number => typeof id === "number")
    .filter((id, i, all) => all.indexOf(id) === i)
    .sort((a, b) => a - b);

  // Same params /api/quotes builds.
  const quoteParams = { id: ids.join(","), convert: "USD" };
  out[cacheKey("/v3/cryptocurrency/quotes/latest", quoteParams)] = await cmcFetch("/v3/cryptocurrency/quotes/latest", quoteParams, apiKey);

  // Same params /api/history builds.
  const historyParams = { id: ids.join(","), count: "30", interval: "daily", convert: "USD" };
  out[cacheKey("/v3/cryptocurrency/quotes/historical", historyParams)] = await cmcFetch("/v3/cryptocurrency/quotes/historical", historyParams, apiKey);

  // Same params /api/rwa builds.
  const rwaIds = [...new Set(ids.map((id) => rwaLink(id)?.rwaId).filter((x): x is number => typeof x === "number"))].sort((a, b) => a - b);
  if (rwaIds.length) {
    const rwaParams = { rwa_id: rwaIds.join(","), skip_invalid: "true" };
    out[cacheKey("/v5/real-world-assets/quotes/latest", rwaParams)] = await cmcFetch("/v5/real-world-assets/quotes/latest", rwaParams, apiKey);
  }

  writeFileSync("data/snapshots.json", JSON.stringify(out) + "\n");
  console.log(`Saved ${Object.keys(out).length} responses covering ${ids.length} tokens and ${rwaIds.length} real-world assets.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
