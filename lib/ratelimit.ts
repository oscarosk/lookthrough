// Keeps a public demo from draining the API key during judging.
// Per-visitor: 40 requests a minute to Lookthrough's API routes.
// In memory per server instance, which is enough to stop casual abuse.
import "server-only";

const WINDOW_MS = 60_000;
const PER_VISITOR = 40;
const hits = new Map<string, number[]>();

function visitor(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

/** Returns a 429 response when the visitor is over the limit, otherwise null. */
export function rateLimited(req: Request): Response | null {
  const now = Date.now();
  const key = visitor(req);
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  if (recent.length <= PER_VISITOR) return null;
  return Response.json(
    { ok: false, error: "Too many requests from this browser. Wait a minute and try again." },
    { status: 429, headers: { "Retry-After": "60" } },
  );
}
