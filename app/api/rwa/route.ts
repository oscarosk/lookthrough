// GET /api/rwa?ids=36992,4705
// For held tokens that represent real-world assets: which asset, which issuer,
// and every other token CMC tracks for the same asset.
// Uses /v5/real-world-assets/quotes/latest (cached 5 minutes).
import { NextRequest } from "next/server";
import { errorMessage, getCmc } from "@/lib/cmc";
import { rateLimited } from "@/lib/ratelimit";
import { parseRwaQuotes } from "@/lib/rwa";
import { rwaLink } from "@/lib/rwa-index";
import type { ApiResult, RwaLookup } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = rateLimited(req);
  if (limited) return limited;

  const ids = (req.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  const links: RwaLookup["links"] = {};
  for (const id of ids) {
    const link = rwaLink(id);
    if (link) links[id] = link;
  }
  const rwaIds = [...new Set(Object.values(links).map((l) => l.rwaId))].sort((a, b) => a - b);
  if (rwaIds.length === 0) {
    return Response.json({ ok: true, data: { links: {}, assets: {} } } satisfies ApiResult<RwaLookup>);
  }

  const params = { rwa_id: rwaIds.join(","), skip_invalid: "true" };
  try {
    const { json, meta } = await getCmc("/v5/real-world-assets/quotes/latest", params, 300);
    const assets: RwaLookup["assets"] = {};
    for (const a of parseRwaQuotes(json.data)) assets[a.rwaId] = a;
    const body: ApiResult<RwaLookup> = { ok: true, data: { links, assets }, meta };
    return Response.json(body);
  } catch (err) {
    const body: ApiResult<never> = { ok: false, error: errorMessage(err), meta: { endpoint: "/v5/real-world-assets/quotes/latest", params } };
    return Response.json(body, { status: 502 });
  }
}
