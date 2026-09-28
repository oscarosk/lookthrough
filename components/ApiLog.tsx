import { timeAgo } from "@/lib/format";
import type { CallMeta } from "@/lib/types";

export interface LogEntry {
  n: number;
  at: string;
  route: string;
  ok: boolean;
  error?: string;
  meta?: Partial<CallMeta>;
}

const SOURCE_TEXT = {
  live: "Live call to CoinMarketCap",
  cache: "Reused a cached response, no credits used",
  snapshot: "CoinMarketCap unreachable, saved snapshot shown",
} as const;

export default function ApiLog({ entries }: { entries: LogEntry[] }) {
  const credits = entries.reduce((s, e) => s + (e.meta?.creditCount ?? 0), 0);
  return (
    <details className="block log">
      <summary>
        CoinMarketCap calls behind this page <span className="muted">({entries.length} calls, {credits} credits used this visit)</span>
      </summary>
      {entries.length === 0 ? (
        <p className="muted">No calls yet. Load the sample portfolio or add a holding.</p>
      ) : (
        <ol className="log-list" reversed>
          {[...entries].reverse().map((e) => (
            <li key={e.n}>
              <div className="log-head">
                <code>GET {e.meta?.endpoint ?? e.route}</code>
                <span className={e.ok ? `src src-${e.meta?.source ?? "cache"}` : "src src-err"}>
                  {!e.ok ? "Failed" : e.meta?.source ? SOURCE_TEXT[e.meta.source] : "No CoinMarketCap call needed"}
                </span>
              </div>
              <p className="log-sub">
                {e.meta?.params && Object.keys(e.meta.params).length > 0 && (
                  <>
                    Params <code>{Object.entries(e.meta.params).map(([k, v]) => `${k}=${v}`).join("&")}</code>.{" "}
                  </>
                )}
                {e.ok && !e.meta ? (
                  <>Answered from Lookthrough&apos;s index of CoinMarketCap RWA tokens: none of these holdings are tokenised real-world assets.</>
                ) : e.ok ? (
                  <>
                    CMC timestamp {timeAgo(e.meta?.cmcTimestamp ?? null)}, {e.meta?.creditCount ?? 0} credit(s), {e.meta?.elapsedMs ?? 0} ms at CMC.
                  </>
                ) : (
                  <>{e.error}</>
                )}
              </p>
              {e.ok && e.meta?.rawPreview && (
                <details>
                  <summary>Raw response</summary>
                  <pre>{e.meta.rawPreview}</pre>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}
