// GET /api/key-info — plan and credit usage. Costs 0 credits. Useful health check.
import { errorMessage, getCmc } from "@/lib/cmc";
import { rateLimited } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;

  try {
    const { json, meta } = await getCmc("/v1/key/info", {}, 30);
    return Response.json({ ok: true, data: json.data, meta });
  } catch (err) {
    return Response.json({ ok: false, error: errorMessage(err) }, { status: 502 });
  }
}
