// The sample portfolio behind "Try it with a sample portfolio".
import census from "@/data/census.json";
import { SAMPLE } from "./portfolio";

export interface SampleExtra {
  cryptoId: number;
  symbol: string;
  name: string;
  /** Target position size in USD; quantity is set from the live price. */
  targetUsd: number;
  costFactor: number;
}

/** A thinly traded tokenised stock picked by the census, if one was found. */
export function sampleExtras(): SampleExtra[] {
  const s = (census as unknown as { sample?: { cryptoId: number; symbol: string; name: string } | null }).sample;
  return s ? [{ cryptoId: s.cryptoId, symbol: s.symbol, name: s.name, targetUsd: 6000, costFactor: 1.06 }] : [];
}

export const sampleSymbols = () => [...new Set(SAMPLE.map((s) => s.symbol.toUpperCase()))].sort();
