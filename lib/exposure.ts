// Regroup positions by what they really are (underlying) and by who issued them.
import { NO_ISSUER, type AssetClass } from "./underlying";

const NOT_AN_ISSUER = new Set([NO_ISSUER, "No issuer (derivative)"]);

export interface Position {
  id: number;
  symbol: string;
  name: string;
  value: number;
  underlying: string;
  assetClass: AssetClass;
  issuer: string;
  basis?: "cmc-rwa" | "curated" | "none";
}

export interface Group {
  label: string;
  value: number;
  share: number;
  symbols: string[];
  assetClass?: AssetClass;
}

export const UNDERLYING_WARN = 0.15;
export const ISSUER_WARN = 0.3;

function group(positions: Position[], by: (p: Position) => string): Group[] {
  const total = positions.reduce((s, p) => s + p.value, 0);
  const map = new Map<string, Group>();
  for (const p of positions) {
    const label = by(p);
    const g = map.get(label) ?? { label, value: 0, share: 0, symbols: [], assetClass: p.assetClass };
    g.value += p.value;
    g.symbols.push(p.symbol);
    map.set(label, g);
  }
  return [...map.values()]
    .map((g) => ({ ...g, share: total > 0 ? g.value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

export function byUnderlying(positions: Position[]): Group[] {
  return group(positions, (p) => p.underlying);
}

/** Issuer groups, excluding native assets that have no issuer. */
export function byIssuer(positions: Position[]): Group[] {
  const total = positions.reduce((s, p) => s + p.value, 0);
  return group(positions, (p) => p.issuer)
    .filter((g) => !NOT_AN_ISSUER.has(g.label))
    .map((g) => ({ ...g, share: total > 0 ? g.value / total : 0 }));
}

/** Groups built from more than one token whose share passes the threshold. */
export function hiddenConcentration(groups: Group[], threshold: number): Group[] {
  return groups.filter((g) => g.share >= threshold && g.symbols.length > 1);
}

export function countBets(positions: Position[]): number {
  return new Set(positions.map((p) => p.underlying)).size;
}
