import { describe, expect, it } from "vitest";
import { compareWrappers, normalizeIssuer, parseRwaQuotes } from "@/lib/rwa";

// Trimmed from a real /v5/real-world-assets/quotes/latest?rwa_id=2 response.
const nvidia = {
  rwa_assets: [
    {
      name: "Nvidia Corp",
      symbol: "NVDA",
      slug: "nvidia",
      rwa_id: 2,
      asset_type: "stock",
      average_tokenized_price: 223.2187,
      tokenized_volume_24h: 61745468.42,
      tokens: [
        { symbol: "NVDAX", name: "NVIDIA tokenized stock (xStock)", price: 223.5267, crypto_id: 36992, issuer_name: "Backed Assets", market_cap: 41621989.66, volume_24h: 8279750.56 },
        { symbol: "NVDA.D", name: "NVIDIA tokenized stock (Dinari)", price: null, crypto_id: 28616, issuer_name: "Dinari Assets", market_cap: null, volume_24h: null },
        { symbol: "NVDA", name: "NVIDIA (Derivatives)", price: 223.43, crypto_id: 38153, issuer_name: "NA (Derivatives)", market_cap: 0, volume_24h: 99999999999 },
        { symbol: "NVDA", name: "NVIDIA Tokenized Stock (Robinhood)", price: 223.12, crypto_id: 40685, issuer_name: "Robinhood", market_cap: 20327898.25, volume_24h: 34920340.73 },
      ],
    },
  ],
};

describe("RWA quotes", () => {
  it("parses assets and their tokens, including null prices", () => {
    const [a] = parseRwaQuotes(nvidia);
    expect(a).toMatchObject({ rwaId: 2, name: "Nvidia Corp", assetType: "stock" });
    expect(a.tokens).toHaveLength(4);
    expect(a.tokens[1]).toMatchObject({ symbol: "NVDA.D", price: null, volume24h: null });
  });

  it("finds a busier token for the same asset, ignoring derivatives", () => {
    const [a] = parseRwaQuotes(nvidia);
    const w = compareWrappers(a, 36992, 223.5267, 8279750.56);
    expect(w.busier?.cryptoId).toBe(40685);
    expect(w.busierRatio).toBeCloseTo(4.22, 1);
    expect(w.tokenCount).toBe(3);
    expect(w.priceGap).toBeCloseTo(0.0014, 3);
  });

  it("hides price gaps that are really unit mismatches", () => {
    const [a] = parseRwaQuotes(nvidia);
    // A token priced 30x the average (per ounce vs per gram) is not a real premium.
    expect(compareWrappers(a, 36992, 223.2187 * 31.1, 8279750.56).priceGap).toBeNull();
  });

  it("normalises issuer names", () => {
    expect(normalizeIssuer("Backed Assets")).toBe("Backed");
    expect(normalizeIssuer("Tether Holdings")).toBe("Tether");
    expect(normalizeIssuer("NA (Derivatives)")).toBe("No issuer (derivative)");
  });
});
