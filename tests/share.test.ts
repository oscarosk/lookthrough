import { describe, expect, it } from "vitest";
import { decodeHoldings, encodeHoldings, parsePasted } from "@/lib/share";

describe("share links", () => {
  it("round-trips holdings through the link format", () => {
    const text = encodeHoldings([
      { id: 1, symbol: "BTC", name: "Bitcoin", quantity: 0.12, buyPrice: 64000 },
      { id: 4705, symbol: "PAXG", name: "PAX Gold", quantity: 2, buyPrice: null },
    ]);
    expect(text).toBe("1:0.12:64000,4705:2");
    expect(decodeHoldings(text)).toEqual([
      { id: 1, symbol: "", name: "", quantity: 0.12, buyPrice: 64000 },
      { id: 4705, symbol: "", name: "", quantity: 2, buyPrice: null },
    ]);
  });

  it("ignores broken or duplicate entries", () => {
    expect(decodeHoldings("x:1,5:-2,7:3,7:4")).toEqual([{ id: 7, symbol: "", name: "", quantity: 3, buyPrice: null }]);
  });
});

describe("pasting a portfolio", () => {
  it("reads several formats", () => {
    const { lines, bad } = parsePasted("BTC 0.5\nPAXG 2 @ 3,900; nvdax 10 at $180, ETH: 1.5\nhello");
    expect(lines).toEqual([
      { symbol: "BTC", quantity: 0.5, buyPrice: null },
      { symbol: "PAXG", quantity: 2, buyPrice: 3900 },
      { symbol: "NVDAX", quantity: 10, buyPrice: 180 },
      { symbol: "ETH", quantity: 1.5, buyPrice: null },
    ]);
    expect(bad).toEqual(["hello"]);
  });

  it("keeps thousands separators inside numbers", () => {
    expect(parsePasted("USDT 4,000").lines[0]).toEqual({ symbol: "USDT", quantity: 4000, buyPrice: null });
  });
});
