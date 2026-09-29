// GET /api/chains?ids=1,4705
// Which blockchain each holding is issued on (`platform`) and its logo, from
// /v2/cryptocurrency/info, cached for a day. Native coins have no platform.
import { NextRequest } from "next/server";
import { errorMessage, getCmc } from "@/lib/cmc";
import { parseInfo, type TokenInfo } from "@/lib/parse";
import { rateLimited } from "@/lib/ratelimit";
import type { ApiResult } from "@/lib/types";

export const dynamic = "force-dynamic";

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
  const params = { id: [...new Set(ids)].sort((a, b) => a - b).join(",") };
  try {
    const { json, meta } = await getCmc("/v2/cryptocurrency/info", params, 86_400);
    const body: ApiResult<Record<number, TokenInfo>> = { ok: true, data: parseInfo(json.data), meta };
    return Response.json(body);
  } catch (err) {
    const body: ApiResult<never> = { ok: false, error: errorMessage(err), meta: { endpoint: "/v2/cryptocurrency/info", params } };
    return Response.json(body, { status: 502 });
  }
}
