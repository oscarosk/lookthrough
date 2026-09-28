// Server-only CoinMarketCap access: in-memory cache + snapshot fallback.
// The API key never leaves the server.
import "server-only";
import snapshots from "@/data/snapshots.json";
import { cacheKey, cmcFetch, CmcError, type CmcResponse } from "./cmc-core";
import type { CallMeta } from "./types";

const memory = new Map<string, { at: number; json: CmcResponse }>();

// Credit guard: at most 60 live CoinMarketCap calls a minute per server
// instance. Beyond that, cached or snapshot data is served instead.
const LIVE_PER_MINUTE = 60;
let liveCalls: number[] = [];
function liveBudgetLeft(): boolean {
  const now = Date.now();
  liveCalls = liveCalls.filter((t) => now - t < 60_000);
  if (liveCalls.length >= LIVE_PER_MINUTE) return false;
  liveCalls.push(now);
  return true;
}
const SNAPSHOTS = snapshots as unknown as Record<string, CmcResponse>;

function preview(json: unknown): string {
  const text = JSON.stringify(json, null, 2);
  return text.length > 1200 ? `${text.slice(0, 1200)}\n…` : text;
}

function meta(
  path: string,
  params: Record<string, string>,
  json: CmcResponse,
  source: CallMeta["source"],
): CallMeta {
  return {
    endpoint: path,
    params,
    source,
    cmcTimestamp: json.status?.timestamp ?? null,
    creditCount: source === "live" ? (json.status?.credit_count ?? 0) : 0,
    elapsedMs: json.status?.elapsed ?? 0,
    rawPreview: preview(json),
  };
}

/**
 * Fetch from CoinMarketCap.
 * 1. Serve from memory if younger than ttlSeconds (saves credits).
 * 2. Otherwise call CMC live.
 * 3. If the live call fails, serve the committed snapshot for this exact
 *    request, labelled as a snapshot, so the app keeps working.
 */
export async function getCmc(
  path: string,
  params: Record<string, string>,
  ttlSeconds: number,
): Promise<{ json: CmcResponse; meta: CallMeta }> {
  const key = cacheKey(path, params);
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < ttlSeconds * 1000) {
    return { json: hit.json, meta: meta(path, params, hit.json, "cache") };
  }

  const apiKey = process.env.CMC_API_KEY;
  try {
    if (!apiKey) throw new CmcError("CMC_API_KEY is not set on the server", 500, null);
    if (!liveBudgetLeft()) {
      if (hit) return { json: hit.json, meta: meta(path, params, hit.json, "cache") };
      throw new CmcError("Lookthrough is busy. Try again in a minute.", 503, null);
    }
    const json = await cmcFetch(path, params, apiKey);
    memory.set(key, { at: Date.now(), json });
    return { json, meta: meta(path, params, json, "live") };
  } catch (err) {
    const snap = SNAPSHOTS[key];
    if (snap) return { json: snap, meta: meta(path, params, snap, "snapshot") };
    throw err;
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof CmcError) return err.message;
  if (err instanceof Error) return err.message;
  return "Unknown error";
}
