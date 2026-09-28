import { describe, expect, it } from "vitest";
import { byIssuer, byUnderlying, countBets, hiddenConcentration, type Position } from "@/lib/exposure";
import { lookThrough } from "@/lib/underlying";

function pos(id: number, symbol: string, name: string, value: number): Position {
  return { id, symbol, name, value, ...lookThrough(symbol, name) };
}

const portfolio = [
  pos(1, "BTC", "Bitcoin", 4000),
  pos(2, "WBTC", "Wrapped Bitcoin", 1000),
  pos(3, "PAXG", "PAX Gold", 2500),
  pos(4, "XAUT", "Tether Gold", 1500),
  pos(5, "USDT", "Tether USDt", 1000),
];

describe("look-through exposure", () => {
  it("merges wrappers of the same underlying", () => {
    const groups = byUnderlying(portfolio);
    expect(groups[0]).toMatchObject({ label: "Bitcoin", value: 5000, symbols: ["BTC", "WBTC"] });
    expect(groups.find((g) => g.label === "Gold")?.share).toBeCloseTo(0.4);
    expect(countBets(portfolio)).toBe(3);
  });

  it("flags a bet hidden across several tokens", () => {
    const flagged = hiddenConcentration(byUnderlying(portfolio), 0.2);
    expect(flagged.map((g) => g.label)).toEqual(["Bitcoin", "Gold"]);
  });

  it("groups by issuer and leaves out native coins", () => {
    const issuers = byIssuer(portfolio);
    const tether = issuers.find((g) => g.label === "Tether");
    expect(tether?.symbols.sort()).toEqual(["USDT", "XAUT"]);
    expect(tether?.share).toBeCloseTo(0.25);
    expect(issuers.some((g) => g.label.startsWith("No issuer"))).toBe(false);
  });

  it("recognises tokenised stocks by name", () => {
    expect(lookThrough("ABCX", "Coinbase xStock")).toMatchObject({ underlying: "Coinbase", assetClass: "Stocks" });
  });
});

describe("CMC RWA data takes priority", () => {
  it("uses the RWA asset and normalised issuer when available", () => {
    const u = lookThrough("NVDAX", "NVIDIA tokenized stock (xStock)", { assetName: "Nvidia Corp", assetType: "stock", issuer: "Backed" });
    expect(u).toMatchObject({ underlying: "Nvidia Corp", assetClass: "Stocks", issuer: "Backed", basis: "cmc-rwa" });
  });

  it("falls back to the name pattern for xStocks", () => {
    expect(lookThrough("NVDAX", "NVIDIA tokenized stock (xStock)")).toMatchObject({ underlying: "NVIDIA", issuer: "Backed" });
  });
});
