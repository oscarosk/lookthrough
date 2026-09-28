import { describe, expect, it } from "vitest";
import { parseMap, parseQuotes, pickBest } from "@/lib/parse";

describe("parsing CoinMarketCap responses", () => {
  it("reads quotes keyed by id and by symbol", () => {
    const byId = { "1": { id: 1, name: "Bitcoin", symbol: "BTC", quote: { USD: { price: 100, volume_24h: 5, percent_change_24h: 1, market_cap: 9 } } } };
    const bySymbol = { BTC: [{ id: 1, name: "Bitcoin", symbol: "BTC", quote: { USD: { price: 100 } } }] };
    expect(parseQuotes(byId)[0]).toMatchObject({ id: 1, price: 100, volume24h: 5 });
    expect(parseQuotes(bySymbol)[0]).toMatchObject({ id: 1, price: 100, volume24h: null });
  });

  it("skips malformed entries instead of crashing", () => {
    expect(parseQuotes({ "1": { nope: true } })).toEqual([]);
    expect(parseMap("not an array")).toEqual([]);
  });

  it("prefers the best-ranked coin when tickers collide", () => {
    const coins = parseMap([
      { id: 9, name: "Copycat", symbol: "PAXG", slug: "copycat", rank: null },
      { id: 4705, name: "PAX Gold", symbol: "PAXG", slug: "pax-gold", rank: 80 },
    ]);
    expect(pickBest(coins)?.id).toBe(4705);
  });
});
