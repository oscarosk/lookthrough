// GET /api/metals?ids=3575,3574
// Spot price per troy ounce of gold (3575) and silver (3574), from
// /v2/tools/price-conversion by CoinMarketCap ID, cached 5 minutes.
import { NextRequest } from "next/server";
import { getCmc } from "@/lib/cmc";
import { METALS } from "@/lib/metals";
import { parseConversionPrice } from "@/lib/parse";
import { rateLimited } from "@/lib/ratelimit";
import type { ApiResult, CallMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(Object.values(METALS).map((m) => m.cmcId));

export async function GET(req: NextRequest) {
  const limited = rateLimited(req);
  if (limited) return limited;

  const ids = (req.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => ALLOWED.has(n));
  if (ids.length === 0) {
    return Response.json({ ok: false, error: "Pass ?ids=3575,3574" } satisfies ApiResult<never>, { status: 400 });
  }

  const prices: Record<number, number | null> = {};
  let meta: CallMeta | undefined;
  for (const id of [...new Set(ids)].sort((a, b) => a - b)) {
    try {
      const r = await getCmc("/v2/tools/price-conversion", { amount: "1", convert: "USD", id: String(id) }, 300);
      prices[id] = parseConversionPrice(r.json.data);
      meta = r.meta;
    } catch {
      prices[id] = null; // a missing reference only hides the comparison
    }
  }
  const body: ApiResult<Record<number, number | null>> = { ok: true, data: prices, meta };
  return Response.json(body);
}
