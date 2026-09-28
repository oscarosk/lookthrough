// "Could you actually sell this position?"
// Assumes you can sell about 10% of a token's daily volume without moving
// the price much. That share is a rule of thumb, stated in the UI.

export const PARTICIPATION = 0.1;

export type ExitGrade = "liquid" | "day" | "slow" | "stuck";

export interface ExitResult {
  grade: ExitGrade;
  /** Days needed to sell at PARTICIPATION of daily volume. Infinity if no volume. */
  daysToExit: number;
  /** Position value as a share of one day's total volume. */
  shareOfDailyVolume: number;
}

export const GRADE_LABEL: Record<ExitGrade, string> = {
  liquid: "Sells easily",
  day: "Sells within a day",
  slow: "Takes days to sell",
  stuck: "Hard to sell",
};

export function exitCheck(positionValue: number, volume24h: number | null): ExitResult {
  if (!volume24h || volume24h <= 0) {
    return { grade: "stuck", daysToExit: Infinity, shareOfDailyVolume: Infinity };
  }
  const share = positionValue / volume24h;
  const days = share / PARTICIPATION;
  let grade: ExitGrade;
  if (days <= 0.1) grade = "liquid";
  else if (days <= 1) grade = "day";
  else if (days <= 5) grade = "slow";
  else grade = "stuck";
  return { grade, daysToExit: days, shareOfDailyVolume: share };
}

export function isHardToSell(r: ExitResult): boolean {
  return r.grade === "slow" || r.grade === "stuck";
}
