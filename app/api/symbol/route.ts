// GET /api/symbol?symbol=PAXG
// All active coins with this ticker, from /v1/cryptocurrency/map (cached 24h).
import { NextRequest } from "next/server";
import { errorMessage, getCmc } from "@/lib/cmc";
import { rateLimited } from "@/lib/ratelimit";
import { parseMap } from "@/lib/parse";
import type { ApiResult, CoinRef } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = rateLimited(req);
  if (limited) return limited;

  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9.$-]{1,20}$/.test(symbol)) {
    return Response.json({ ok: false, error: "Enter a ticker symbol, like PAXG" } satisfies ApiResult<never>, { status: 400 });
  }
  const params = { symbol };
  try {
    const { json, meta } = await getCmc("/v1/cryptocurrency/map", params, 86_400);
    const coins = parseMap(json.data).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
    const body: ApiResult<CoinRef[]> = { ok: true, data: coins, meta };
    return Response.json(body);
  } catch (err) {
    const body: ApiResult<never> = { ok: false, error: errorMessage(err), meta: { endpoint: "/v1/cryptocurrency/map", params } };
    return Response.json(body, { status: 502 });
  }
}
