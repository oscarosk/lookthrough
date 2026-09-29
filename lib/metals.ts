// Gold and silver tokens compared with the metal's own spot price.
// CoinMarketCap prices the metals themselves through /v2/tools/price-conversion,
// by ID (the symbol "XAU" also matches a meme coin and a derivative).

/** RWA asset id → CoinMarketCap id of the metal's troy-ounce price. */
export const METALS: Record<number, { cmcId: number; name: string }> = {
  1: { cmcId: 3575, name: "gold" }, // Gold Troy Ounce
  5: { cmcId: 3574, name: "silver" }, // Silver Troy Ounce
};

const GRAMS_PER_OZ = 31.1035;
const OZ_PER_KG = 1000 / GRAMS_PER_OZ;

export type MetalUnit = "troy ounce" | "gram" | "kilogram";

/**
 * Premium of a token over spot, after working out which unit the token is
 * priced in (tokens for one metal can be per ounce, per gram or per kilogram).
 * Returns null when the price matches none of those units.
 */
export function spotGap(tokenPrice: number | null, spotPerOz: number | null): { gap: number; unit: MetalUnit } | null {
  if (!tokenPrice || !spotPerOz || tokenPrice <= 0 || spotPerOz <= 0) return null;
  const candidates: [MetalUnit, number][] = [
    ["troy ounce", spotPerOz],
    ["gram", spotPerOz / GRAMS_PER_OZ],
    ["kilogram", spotPerOz * OZ_PER_KG],
  ];
  for (const [unit, ref] of candidates) {
    const gap = tokenPrice / ref - 1;
    if (Math.abs(gap) <= 0.15) return { gap, unit };
  }
  return null;
}
