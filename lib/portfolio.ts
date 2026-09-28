// Holdings live in the visitor's own browser. Nothing is sent to a database.
import type { Holding } from "./types";

const KEY = "lookthrough:holdings:v1";

export function loadHoldings(): Holding[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Holding[]) : [];
  } catch {
    return [];
  }
}

export function saveHoldings(holdings: Holding[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(holdings));
  } catch {
    // Storage full or blocked: the page still works for this visit.
  }
}

/**
 * Sample portfolio for the demo button. Buy prices are illustrative:
 * set as a fixed fraction of the live price when the sample loads.
 */
export const SAMPLE: { symbol: string; quantity: number; costFactor: number }[] = [
  { symbol: "BTC", quantity: 0.12, costFactor: 0.78 },
  { symbol: "WBTC", quantity: 0.05, costFactor: 0.92 },
  { symbol: "ETH", quantity: 1.8, costFactor: 1.12 },
  { symbol: "USDT", quantity: 4000, costFactor: 1 },
  { symbol: "PAXG", quantity: 2, costFactor: 0.84 },
  { symbol: "XAUT", quantity: 1.5, costFactor: 0.9 },
  { symbol: "NVDAX", quantity: 60, costFactor: 0.95 },
  { symbol: "TSLAX", quantity: 40, costFactor: 1.18 },
  { symbol: "USDY", quantity: 3000, costFactor: 0.97 },
];
