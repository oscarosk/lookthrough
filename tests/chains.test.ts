import { describe, expect, it } from "vitest";
import { byChain, chainConcentration, NATIVE } from "@/lib/chains";
import type { Position } from "@/lib/exposure";
import { parseInfo } from "@/lib/parse";

const pos = (id: number, symbol: string, value: number): Position => ({ id, symbol, name: symbol, value, underlying: symbol, assetClass: "Crypto", issuer: "x" });

describe("chains", () => {
  it("reads chain and logo from /v2/cryptocurrency/info, null chain for native coins", () => {
    const data = {
      "1": { id: 1, name: "Bitcoin", symbol: "BTC", platform: null, logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png" },
      "4705": { id: 4705, name: "PAX Gold", symbol: "PAXG", platform: { id: 1027, name: "Ethereum", slug: "ethereum" }, logo: "javascript:alert(1)" },
    };
    expect(parseInfo(data)).toEqual({
      1: { chain: null, logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png", notice: null },
      4705: { chain: "Ethereum", logo: null, notice: null },
    });
  });

  it("groups positions by chain and flags one chain carrying a large share", () => {
    const positions = [pos(1, "BTC", 2000), pos(4705, "PAXG", 5000), pos(825, "USDT", 3000)];
    const groups = byChain(positions, { 1: null, 4705: "Ethereum", 825: "Ethereum" });
    expect(groups[0]).toMatchObject({ label: "Ethereum", share: 0.8, symbols: ["PAXG", "USDT"] });
    expect(groups[1].label).toBe(NATIVE);
    expect(chainConcentration(groups)?.label).toBe("Ethereum");
  });

  it("does not flag native coins or single tokens", () => {
    const groups = byChain([pos(1, "BTC", 9000), pos(4705, "PAXG", 1000)], { 1: null, 4705: "Ethereum" });
    expect(chainConcentration(groups)).toBeNull();
  });
});
