// GET /api/resolve?symbols=BTC,ETH,PAXG
// One /v1/cryptocurrency/map call resolves many tickers; best rank wins.
import { NextRequest } from "next/server";
import { errorMessage, getCmc } from "@/lib/cmc";
import { parseMap, pickBest } from "@/lib/parse";
import type { ApiResult, CoinRef } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z0-9.$-]{1,20}$/.test(s));
  if (symbols.length === 0) {
    return Response.json({ ok: false, error: "Pass ?symbols=BTC,ETH" } satisfies ApiResult<never>, { status: 400 });
  }
  const params = { symbol: [...new Set(symbols)].sort().join(",") };
  try {
    const { json, meta } = await getCmc("/v1/cryptocurrency/map", params, 86_400);
    const all = parseMap(json.data);
    const resolved: Record<string, CoinRef> = {};
    for (const s of symbols) {
      const best = pickBest(all.filter((c) => c.symbol.toUpperCase() === s));
      if (best) resolved[s] = best;
    }
    const body: ApiResult<Record<string, CoinRef>> = { ok: true, data: resolved, meta };
    return Response.json(body);
  } catch (err) {
    const body: ApiResult<never> = { ok: false, error: errorMessage(err), meta: { endpoint: "/v1/cryptocurrency/map", params } };
    return Response.json(body, { status: 502 });
  }
}
