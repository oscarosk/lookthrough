import { describe, expect, it } from "vitest";
import { exitCheck, isHardToSell } from "@/lib/exitCheck";

describe("exitCheck", () => {
  it("grades a tiny position in a deep market as liquid", () => {
    const r = exitCheck(10_000, 1_000_000_000);
    expect(r.grade).toBe("liquid");
    expect(isHardToSell(r)).toBe(false);
  });

  it("works out days to sell at 10% of daily volume", () => {
    // $30k position, $100k daily volume → 30% of a day → 3 days at 10% pace.
    const r = exitCheck(30_000, 100_000);
    expect(r.shareOfDailyVolume).toBeCloseTo(0.3);
    expect(r.daysToExit).toBeCloseTo(3);
    expect(r.grade).toBe("slow");
    expect(isHardToSell(r)).toBe(true);
  });

  it("treats missing or zero volume as hard to sell", () => {
    expect(exitCheck(500, 0).grade).toBe("stuck");
    expect(exitCheck(500, null).daysToExit).toBe(Infinity);
  });
});
