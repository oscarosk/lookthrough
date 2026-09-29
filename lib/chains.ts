// Group positions by the blockchain their token is issued on.
import type { Position } from "./exposure";

export const NATIVE = "Own blockchain (native coin)";
export const CHAIN_WARN = 0.4;

export interface ChainGroup {
  label: string;
  value: number;
  share: number;
  symbols: string[];
}

export function byChain(positions: Position[], chains: Record<number, string | null>): ChainGroup[] {
  const total = positions.reduce((s, p) => s + p.value, 0);
  const map = new Map<string, ChainGroup>();
  for (const p of positions) {
    if (!(p.id in chains)) continue; // unknown until the info call answers
    const label = chains[p.id] ?? NATIVE;
    const g = map.get(label) ?? { label, value: 0, share: 0, symbols: [] };
    g.value += p.value;
    g.symbols.push(p.symbol);
    map.set(label, g);
  }
  return [...map.values()]
    .map((g) => ({ ...g, share: total > 0 ? g.value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

/** A single chain (not native coins) carrying a large share across several tokens. */
export function chainConcentration(groups: ChainGroup[]): ChainGroup | null {
  const top = groups.find((g) => g.label !== NATIVE);
  return top && top.share >= CHAIN_WARN && top.symbols.length > 1 ? top : null;
}
