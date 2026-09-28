// What each token really represents, and who stands behind it.
// This mapping is maintained by hand and documented in the README.
// Anything not listed is treated as its own bet with no issuer.

export type AssetClass = "Crypto" | "Cash" | "Gold" | "Treasuries" | "Stocks";

export interface Underlying {
  underlying: string;
  assetClass: AssetClass;
  issuer: string;
}

export const NO_ISSUER = "No issuer (native asset)";

const KNOWN: Record<string, Underlying> = {
  BTC: { underlying: "Bitcoin", assetClass: "Crypto", issuer: NO_ISSUER },
  WBTC: { underlying: "Bitcoin", assetClass: "Crypto", issuer: "BitGo" },
  CBBTC: { underlying: "Bitcoin", assetClass: "Crypto", issuer: "Coinbase" },
  ETH: { underlying: "Ether", assetClass: "Crypto", issuer: NO_ISSUER },
  STETH: { underlying: "Ether", assetClass: "Crypto", issuer: "Lido" },
  WSTETH: { underlying: "Ether", assetClass: "Crypto", issuer: "Lido" },
  CBETH: { underlying: "Ether", assetClass: "Crypto", issuer: "Coinbase" },
  SOL: { underlying: "Solana", assetClass: "Crypto", issuer: NO_ISSUER },
  USDT: { underlying: "US dollar", assetClass: "Cash", issuer: "Tether" },
  USDC: { underlying: "US dollar", assetClass: "Cash", issuer: "Circle" },
  PYUSD: { underlying: "US dollar", assetClass: "Cash", issuer: "Paxos" },
  FDUSD: { underlying: "US dollar", assetClass: "Cash", issuer: "First Digital" },
  PAXG: { underlying: "Gold", assetClass: "Gold", issuer: "Paxos" },
  XAUT: { underlying: "Gold", assetClass: "Gold", issuer: "Tether" },
  USDY: { underlying: "US Treasuries", assetClass: "Treasuries", issuer: "Ondo Finance" },
  OUSG: { underlying: "US Treasuries", assetClass: "Treasuries", issuer: "Ondo Finance" },
  BUIDL: { underlying: "US Treasuries", assetClass: "Treasuries", issuer: "BlackRock" },
  NVDAX: { underlying: "Nvidia", assetClass: "Stocks", issuer: "Backed (xStocks)" },
  TSLAX: { underlying: "Tesla", assetClass: "Stocks", issuer: "Backed (xStocks)" },
  AAPLX: { underlying: "Apple", assetClass: "Stocks", issuer: "Backed (xStocks)" },
  SPYX: { underlying: "S&P 500", assetClass: "Stocks", issuer: "Backed (xStocks)" },
};

export function lookThrough(symbol: string, name: string): Underlying {
  const known = KNOWN[symbol.toUpperCase()];
  if (known) return known;

  // Tokenised stocks named like "Tesla xStock".
  const xstock = name.match(/^(.+?)\s+xStock$/i);
  if (xstock) return { underlying: xstock[1], assetClass: "Stocks", issuer: "Backed (xStocks)" };

  return { underlying: name, assetClass: "Crypto", issuer: NO_ISSUER };
}
