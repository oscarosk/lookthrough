// Portfolio <-> shareable link. Holdings go in the URL fragment (#p=…),
// which browsers never send to the server, so shared portfolios stay private.
// Format: id:quantity[:buyPrice] joined by commas, e.g. #p=1:0.12:64000,4705:2
import type { Holding } from "./types";

export function encodeHoldings(holdings: Holding[]): string {
  return holdings
    .map((h) => [h.id, +h.quantity.toPrecision(10), ...(h.buyPrice !== null ? [+h.buyPrice.toPrecision(8)] : [])].join(":"))
    .join(",");
}

export function decodeHoldings(text: string): Holding[] {
  const out: Holding[] = [];
  for (const part of text.split(",")) {
    const [id, qty, buy] = part.split(":").map(Number);
    if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(qty) || qty <= 0) continue;
    if (out.some((h) => h.id === id)) continue;
    // Symbol and name are filled in from the first quotes response.
    out.push({ id, symbol: "", name: "", quantity: qty, buyPrice: Number.isFinite(buy) && buy >= 0 ? buy : null });
  }
  return out.slice(0, 50);
}

export function holdingsFromLocation(): Holding[] | null {
  try {
    const m = window.location.hash.match(/[#&]p=([^&]+)/);
    if (!m) return null;
    const list = decodeHoldings(decodeURIComponent(m[1]));
    return list.length ? list : null;
  } catch {
    return null;
  }
}

export function shareUrl(holdings: Holding[]): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#p=${encodeHoldings(holdings)}`;
}

export interface PastedLine {
  symbol: string;
  quantity: number;
  buyPrice: number | null;
}

/**
 * Reads lines like "BTC 0.5", "PAXG 2 @ 3900" or "NVDAX 10 @ $180".
 * Items can be separated by new lines, semicolons, or commas before a ticker.
 */
export function parsePasted(text: string): { lines: PastedLine[]; bad: string[] } {
  const lines: PastedLine[] = [];
  const bad: string[] = [];
  const items = text
    .split(/\n|;|,(?=\s*[A-Za-z$])/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const item of items) {
    const m = item.match(/^([A-Za-z0-9.$-]{1,20})\s*[:=]?\s+([\d.,]+)(?:\s*(?:@|at)\s*\$?\s*([\d.,]+))?$/i);
    const quantity = m ? Number(m[2].replace(/,/g, "")) : NaN;
    const buy = m && m[3] ? Number(m[3].replace(/,/g, "")) : null;
    if (!m || !Number.isFinite(quantity) || quantity <= 0 || (buy !== null && !Number.isFinite(buy))) {
      bad.push(item);
      continue;
    }
    lines.push({ symbol: m[1].toUpperCase(), quantity, buyPrice: buy });
  }
  return { lines, bad };
}
