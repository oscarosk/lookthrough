// GET /api/history?ids=1,4705
// Median daily volume over the last 30 days, from
// /v3/cryptocurrency/quotes/historical (cached 6 hours). One noisy day should
// not decide whether a position is easy to sell.
import { NextRequest } from "next/server";
import { errorMessage, getCmc } from "@/lib/cmc";
import { parseHistory } from "@/lib/parse";
import { rateLimited } from "@/lib/ratelimit";
import type { ApiResult, VolumeHistory } from "@/lib/types";

export const dynamic = "force-dynamic";
const HISTORY_DAYS = 30;

export async function GET(req: NextRequest) {
  const limited = rateLimited(req);
  if (limited) return limited;

  const ids = (req.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) {
    return Response.json({ ok: false, error: "Pass ?ids=1,1027" } satisfies ApiResult<never>, { status: 400 });
  }
  const params = { id: [...new Set(ids)].sort((a, b) => a - b).join(","), count: String(HISTORY_DAYS), interval: "daily", convert: "USD" };
  try {
    const { json, meta } = await getCmc("/v3/cryptocurrency/quotes/historical", params, 21_600);
    const body: ApiResult<Record<number, VolumeHistory>> = { ok: true, data: parseHistory(json.data), meta };
    return Response.json(body);
  } catch (err) {
    const body: ApiResult<never> = { ok: false, error: errorMessage(err), meta: { endpoint: "/v3/cryptocurrency/quotes/historical", params } };
    return Response.json(body, { status: 502 });
  }
}
