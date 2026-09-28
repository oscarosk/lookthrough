export function usd(n: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (opts.compact && abs >= 1_000_000) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  const digits = abs >= 1000 ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: Math.min(digits, 2) }).format(n);
}

export function pct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function signedUsd(n: number): string {
  if (Math.abs(n) < 0.005) return "$0.00";
  const abs = Math.abs(n);
  const text = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: abs >= 1000 ? 0 : 2, minimumFractionDigits: abs >= 1000 ? 0 : 2 }).format(abs);
  return `${n >= 0 ? "+" : "−"}${text}`;
}

export function qty(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: n >= 100 ? 2 : 6 }).format(n);
}

export function days(n: number): string {
  if (!Number.isFinite(n)) return "no tracked trading";
  if (n < 0.042) return "under an hour";
  if (n < 1) {
    const h = Math.max(1, Math.round(n * 24));
    return `about ${h} hour${h === 1 ? "" : "s"}`;
  }
  if (n < 60) return `about ${Math.round(n)} day${Math.round(n) === 1 ? "" : "s"}`;
  return "more than two months";
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "unknown time";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleString();
}
