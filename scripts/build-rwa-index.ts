// Builds data/rwa-index.json: for every token CoinMarketCap links to a
// real-world asset, which asset (rwa_id) and which issuer.
//
// Uses /v5/real-world-assets/issuers/list and /v5/real-world-assets/issuers.
// Run: npm run rwa-index   (about 30 credits)
import { writeFileSync } from "node:fs";
import { cmcFetch } from "../lib/cmc-core";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface IssuerRow { issuer_id: string; name: string; num_tokens: number }
interface IssuerTokens { tokens?: { crypto_id: number; rwa_id: number | null }[]; has_more?: boolean }

async function main() {
  const key = process.env.CMC_API_KEY;
  if (!key) throw new Error("Set CMC_API_KEY in .env.local first");

  const list = await cmcFetch("/v5/real-world-assets/issuers/list", {}, key);
  const issuers = ((list.data as { issuers?: IssuerRow[] })?.issuers ?? []).filter((i) => i.num_tokens > 0);

  const out = { generatedAt: new Date().toISOString(), issuers: {} as Record<string, string>, tokens: {} as Record<string, [number, string]> };
  let credits = list.status.credit_count;

  for (const issuer of issuers) {
    out.issuers[issuer.issuer_id] = issuer.name;
    let start = 1;
    for (;;) {
      const page = await cmcFetch("/v5/real-world-assets/issuers", { issuer_id: issuer.issuer_id, start: String(start), limit: "250" }, key);
      credits += page.status.credit_count;
      const data = page.data as IssuerTokens;
      const tokens = data?.tokens ?? [];
      for (const t of tokens) if (t.rwa_id !== null && t.rwa_id !== undefined) out.tokens[String(t.crypto_id)] = [t.rwa_id, issuer.issuer_id];
      if (!data?.has_more || tokens.length === 0) break;
      start += tokens.length;
      await sleep(150);
    }
    console.log(`${issuer.name}: ${issuer.num_tokens} tokens`);
    await sleep(150);
  }

  writeFileSync("data/rwa-index.json", JSON.stringify(out) + "\n");
  console.log(`\nSaved ${Object.keys(out.tokens).length} linked tokens from ${issuers.length} issuers (${credits} credits).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
