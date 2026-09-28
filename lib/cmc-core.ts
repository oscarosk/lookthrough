// Plain CoinMarketCap client. No Next.js features, so scripts can use it too.

export const CMC_BASE = "https://pro-api.coinmarketcap.com";

export interface CmcStatus {
  timestamp: string;
  error_code: number | string;
  error_message: string | null;
  elapsed: number;
  credit_count: number;
}

export interface CmcResponse {
  status: CmcStatus;
  data: unknown;
}

export class CmcError extends Error {
  constructor(
    message: string,
    public httpStatus: number,
    public errorCode: number | null,
  ) {
    super(message);
    this.name = "CmcError";
  }
}

/** Stable key for a request, used by the cache and the snapshot file. */
export function cacheKey(path: string, params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return sorted ? `${path}?${sorted}` : path;
}

export async function cmcFetch(
  path: string,
  params: Record<string, string>,
  apiKey: string,
): Promise<CmcResponse> {
  const url = new URL(path, CMC_BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { "X-CMC_PRO_API_KEY": apiKey, Accept: "application/json" },
    cache: "no-store",
  });

  let json: CmcResponse | null = null;
  try {
    json = (await res.json()) as CmcResponse;
  } catch {
    throw new CmcError(`CoinMarketCap returned non-JSON (HTTP ${res.status})`, res.status, null);
  }

  // v5 RWA endpoints send error_code as the string "0"; older ones send 0.
  const rawCode = json?.status?.error_code;
  const code = rawCode === undefined || rawCode === null || rawCode === "" ? 0 : Number(rawCode);
  if (!res.ok || code !== 0) {
    const msg = json?.status?.error_message || `HTTP ${res.status}`;
    throw new CmcError(`CoinMarketCap ${path}: ${msg}`, res.status, Number.isNaN(code) ? null : code);
  }
  return json;
}
