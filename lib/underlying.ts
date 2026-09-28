// What each token really represents, and who stands behind it.
// 1. Tokenised real-world assets: CoinMarketCap's own RWA data (live).
// 2. Crypto wrappers and stablecoins: a small hand-kept table below.
// 3. Anything else: its own bet, with no issuer.

export type AssetClass = "Crypto" | "Cash" | "Gold" | "Commodities" | "Treasuries" | "Stocks" | "Funds" | "Real estate";

export interface Underlying {
  underlying: string;
  assetClass: AssetClass;
  issuer: string;
  /** Where this answer came from, shown in the UI. */
  basis: "cmc-rwa" | "curated" | "none";
}

export const NO_ISSUER = "No issuer (native asset)";

type Curated = Omit<Underlying, "basis">;

const CURATED: Record<string, Curated> = {
  BTC: { underlying: "Bitcoin", assetClass: "Crypto", issuer: NO_ISSUER },
  WBTC: { underlying: "Bitcoin", assetClass: "Crypto", issuer: "BitGo" },
  CBBTC: { underlying: "Bitcoin", assetClass: "Crypto", issuer: "Coinbase" },
  ETH: { underlying: "Ether", assetClass: "Crypto", issuer: NO_ISSUER },
  WETH: { underlying: "Ether", assetClass: "Crypto", issuer: NO_ISSUER },
  STETH: { underlying: "Ether", assetClass: "Crypto", issuer: "Lido" },
  WSTETH: { underlying: "Ether", assetClass: "Crypto", issuer: "Lido" },
  CBETH: { underlying: "Ether", assetClass: "Crypto", issuer: "Coinbase" },
  SOL: { underlying: "Solana", assetClass: "Crypto", issuer: NO_ISSUER },
  USDT: { underlying: "US dollar", assetClass: "Cash", issuer: "Tether" },
  USDC: { underlying: "US dollar", assetClass: "Cash", issuer: "Circle" },
  PYUSD: { underlying: "US dollar", assetClass: "Cash", issuer: "Paxos" },
  FDUSD: { underlying: "US dollar", assetClass: "Cash", issuer: "First Digital" },
  // Fallbacks, used only if CMC's RWA data is unavailable.
  PAXG: { underlying: "Gold", assetClass: "Gold", issuer: "Paxos" },
  XAUT: { underlying: "Gold", assetClass: "Gold", issuer: "Tether" },
  USDY: { underlying: "US Treasuries", assetClass: "Treasuries", issuer: "Ondo" },
  OUSG: { underlying: "US Treasuries", assetClass: "Treasuries", issuer: "Ondo" },
};

export function classFor(assetType: string, name: string): AssetClass {
  switch (assetType) {
    case "stock":
      return "Stocks";
    case "etf":
      return "Funds";
    case "government_security":
      return "Treasuries";
    case "currency":
      return "Cash";
    case "real_estate":
      return "Real estate";
    case "commodity":
      return /gold/i.test(name) ? "Gold" : "Commodities";
    default:
      return "Crypto";
  }
}

export interface RwaHint {
  assetName: string;
  assetType: string;
  issuer: string;
}

export function lookThrough(symbol: string, name: string, rwa?: RwaHint | null): Underlying {
  if (rwa) {
    return { underlying: rwa.assetName, assetClass: classFor(rwa.assetType, rwa.assetName), issuer: rwa.issuer, basis: "cmc-rwa" };
  }
  const known = CURATED[symbol.toUpperCase()];
  if (known) return { ...known, basis: "curated" };

  const xstock = name.match(/^(.+?)\s+(?:tokenized stock\s+)?\(?xStock\)?$/i) ?? name.match(/^(.+?)\s+xStock$/i);
  if (xstock) return { underlying: xstock[1], assetClass: "Stocks", issuer: "Backed", basis: "curated" };

  return { underlying: name, assetClass: "Crypto", issuer: NO_ISSUER, basis: "none" };
}
