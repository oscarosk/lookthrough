import type { AssetClass } from "./underlying";

const SHADES: Record<AssetClass, string[]> = {
  Crypto: ["#1E3A5F", "#44648A", "#7189A6", "#9DB0C4"],
  Cash: ["#56796A", "#83A294"],
  Gold: ["#B5872A", "#D1AE5E"],
  Treasuries: ["#2C7472", "#5A9D9A"],
  Stocks: ["#8E3B2C", "#B5644F", "#6C4B7C", "#946E9E", "#A8483A"],
  Commodities: ["#7A6A3A", "#A08F5C"],
  Funds: ["#4B5E8A", "#7485AE"],
  "Real estate": ["#6B5A4A", "#927F6D"],
};

/** One colour per underlying, grouped by asset class so related bets look related. */
export function colorMap(groups: { label: string; assetClass?: AssetClass }[]): Map<string, string> {
  const used: Record<string, number> = {};
  const out = new Map<string, string>();
  for (const g of groups) {
    const cls = g.assetClass ?? "Crypto";
    const i = used[cls] ?? 0;
    const shades = SHADES[cls];
    out.set(g.label, shades[i % shades.length]);
    used[cls] = i + 1;
  }
  return out;
}
