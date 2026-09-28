// Types shared by the server routes and the browser.

/** Where a piece of data came from. Shown to the user in the API log. */
export type DataSource = "live" | "cache" | "snapshot";

/** Evidence about one CoinMarketCap call, returned with every API response. */
export interface CallMeta {
  endpoint: string;
  params: Record<string, string>;
  source: DataSource;
  /** Timestamp CoinMarketCap put on the response (ISO). */
  cmcTimestamp: string | null;
  creditCount: number;
  elapsedMs: number;
  /** First part of the raw CMC JSON, so anyone can see a real response. */
  rawPreview: string;
}

export interface ApiOk<T> {
  ok: true;
  data: T;
  meta: CallMeta;
}

export interface ApiErr {
  ok: false;
  error: string;
  meta?: Partial<CallMeta>;
}

export type ApiResult<T> = ApiOk<T> | ApiErr;

export interface Quote {
  id: number;
  symbol: string;
  name: string;
  price: number | null;
  volume24h: number | null;
  percentChange24h: number | null;
  marketCap: number | null;
  lastUpdated: string | null;
}

export interface CoinRef {
  id: number;
  symbol: string;
  name: string;
  slug: string;
  rank: number | null;
}

export interface Holding {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  /** Price paid per unit in USD. Null means "not entered", so no PnL. */
  buyPrice: number | null;
}
