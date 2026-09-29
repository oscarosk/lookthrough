import { describe, expect, it } from "vitest";
import { spotGap } from "@/lib/metals";
import { parseConversionPrice, parseInfo } from "@/lib/parse";

describe("gold and silver against spot", () => {
  it("reads the price from price-conversion, by id (object) or by symbol (array)", () => {
    // Trimmed from real /v2/tools/price-conversion responses.
    const byId = { id: 3575, symbol: "XAU", name: "Gold Troy Ounce", amount: 1, quote: { USD: { price: 4128.1374 } } };
    const bySymbol = [{ id: 3574, symbol: "XAG", name: "Silver Troy Ounce", quote: { USD: { price: 60.5902 } } }];
    expect(parseConversionPrice(byId)).toBeCloseTo(4128.1374);
    expect(parseConversionPrice(bySymbol)).toBeCloseTo(60.5902);
  });

  it("works out the premium for tokens priced per ounce, gram or kilogram", () => {
    expect(spotGap(4160, 4128)).toMatchObject({ unit: "troy ounce" });
    expect(spotGap(4160, 4128)!.gap).toBeCloseTo(0.00775, 4);
    expect(spotGap(4128 / 31.1035, 4128)).toMatchObject({ unit: "gram" });
    expect(spotGap(4128 / 31.1035, 4128)!.gap).toBeCloseTo(0, 6);
    expect(spotGap(4128 * 32.1507, 4128)).toMatchObject({ unit: "kilogram" });
  });

  it("gives up rather than guess when no unit fits", () => {
    expect(spotGap(1000, 4128)).toBeNull();
    expect(spotGap(null, 4128)).toBeNull();
  });
});

describe("CoinMarketCap notices", () => {
  it("keeps notices as plain text", () => {
    const info = parseInfo({ "9": { id: 9, platform: null, logo: null, notice: "<p>Token <b>migrated</b> to a new contract.</p>" } });
    expect(info[9].notice).toBe("Token migrated to a new contract.");
    expect(parseInfo({ "9": { id: 9, notice: "" } })[9].notice).toBeNull();
  });
});
