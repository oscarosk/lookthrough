// Saves real CoinMarketCap responses for the sample portfolio into
// data/snapshots.json. The app serves these, clearly labelled, only when a
// live call fails (for example after the hackathon key reverts to Basic).
//
// Run: npm run snapshot   (reads CMC_API_KEY from .env.local)
import { writeFileSync } from "node:fs";
import { cacheKey, cmcFetch, type CmcResponse } from "../lib/cmc-core";
import { parseMap, pickBest } from "../lib/parse";
import { SAMPLE } from "../lib/portfolio";

async function main() {
  const apiKey = process.env.CMC_API_KEY;
  if (!apiKey) throw new Error("Set CMC_API_KEY in .env.local first");

  const out: Record<string, CmcResponse> = {};

  // Same params the /api/resolve route builds for the sample button.
  const symbols = [...new Set(SAMPLE.map((s) => s.symbol.toUpperCase()))].sort();
  const mapParams = { symbol: symbols.join(",") };
  const map = await cmcFetch("/v1/cryptocurrency/map", mapParams, apiKey);
  out[cacheKey("/v1/cryptocurrency/map", mapParams)] = map;

  const coins = parseMap(map.data);
  const ids = symbols
    .map((s) => pickBest(coins.filter((c) => c.symbol.toUpperCase() === s))?.id)
    .filter((id): id is number => typeof id === "number")
    .sort((a, b) => a - b);

  // Same params the /api/quotes route builds.
  const quoteParams = { id: ids.join(","), convert: "USD" };
  const quotes = await cmcFetch("/v2/cryptocurrency/quotes/latest", quoteParams, apiKey);
  out[cacheKey("/v2/cryptocurrency/quotes/latest", quoteParams)] = quotes;

  writeFileSync("data/snapshots.json", JSON.stringify(out, null, 2) + "\n");
  const missing = symbols.filter((s) => !coins.some((c) => c.symbol.toUpperCase() === s));
  console.log(`Saved ${Object.keys(out).length} responses for ${ids.length} tokens.`);
  if (missing.length) console.log(`Not found on CoinMarketCap: ${missing.join(", ")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
