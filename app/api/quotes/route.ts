// GET /api/quotes?ids=1,1027,4705
// Live USD quotes from /v2/cryptocurrency/quotes/latest (cached 2 minutes).
import { NextRequest } from "next/server";
import { errorMessage, getCmc } from "@/lib/cmc";
import { parseQuotes } from "@/lib/parse";
import type { ApiResult, Quote } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) {
    return Response.json({ ok: false, error: "Pass ?ids=1,1027" } satisfies ApiResult<never>, { status: 400 });
  }
  // Sorted ids give one cache entry per portfolio, whatever the order.
  const params = { id: [...new Set(ids)].sort((a, b) => a - b).join(","), convert: "USD" };
  try {
    const { json, meta } = await getCmc("/v2/cryptocurrency/quotes/latest", params, 120);
    const body: ApiResult<Quote[]> = { ok: true, data: parseQuotes(json.data), meta };
    return Response.json(body);
  } catch (err) {
    const body: ApiResult<never> = { ok: false, error: errorMessage(err), meta: { endpoint: "/v2/cryptocurrency/quotes/latest", params } };
    return Response.json(body, { status: 502 });
  }
}
