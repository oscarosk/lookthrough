import { describe, expect, it } from "vitest";
import { parseHistory, parseMap, parseQuotes, pickBest } from "@/lib/parse";

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

describe("v3 response shapes", () => {
  it("reads v3 quotes: data as an array, quote as an array of currencies", () => {
    // Trimmed from a real /v3/cryptocurrency/quotes/latest response.
    const data = [
      {
        id: 4705,
        name: "PAX Gold",
        symbol: "PAXG",
        quote: [{ id: 2781, symbol: "USD", price: 4153.3191, volume_24h: 176723103.57, cex_volume_24h: 173777663.35, dex_volume_24h: 2945440.22, percent_change_24h: -2.93 }],
      },
    ];
    expect(parseQuotes(data)[0]).toMatchObject({ id: 4705, price: 4153.3191, volume24h: 176723103.57, dexVolume24h: 2945440.22 });
  });

  it("takes the median of daily volumes from quotes/historical, in either shape", () => {
    const series = (vols: number[]) => vols.map((v) => ({ quote: [{ symbol: "USD", volume_24h: v }] }));
    const asArray = [{ id: 1, quotes: series([10, 1000, 30]) }];
    const asObject = { "1": { id: 1, quotes: [{ quote: { USD: { volume_24h: 10 } } }, { quote: { USD: { volume_24h: 20 } } }] } };
    expect(parseHistory(asArray)[1]).toEqual({ medianVolume: 30, days: 3 });
    expect(parseHistory(asObject)[1]).toEqual({ medianVolume: 15, days: 2 });
  });
});
