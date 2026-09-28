"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddHolding from "./AddHolding";
import ApiLog, { type LogEntry } from "./ApiLog";
import HoldingsTable from "./HoldingsTable";
import Issuers from "./Issuers";
import Lookthrough from "./Lookthrough";
import { colorMap } from "@/lib/colors";
import { exitCheck, isHardToSell } from "@/lib/exitCheck";
import { byIssuer, byUnderlying, countBets, hiddenConcentration, ISSUER_WARN, UNDERLYING_WARN, type Position } from "@/lib/exposure";
import { pct, signedUsd, timeAgo, usd } from "@/lib/format";
import { loadHoldings, SAMPLE, saveHoldings } from "@/lib/portfolio";
import type { ApiResult, CoinRef, DataSource, Holding, Quote } from "@/lib/types";
import { lookThrough } from "@/lib/underlying";

const REFRESH_MS = 120_000;

export default function Dashboard() {
  // This component only renders in the browser (see ClientApp), so reading
  // localStorage in the initialiser is safe.
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings);
  const [quotes, setQuotes] = useState<Record<number, Quote>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [lastQuote, setLastQuote] = useState<{ source: DataSource; at: string | null } | null>(null);
  const counter = useRef(0);

  const call = useCallback(async <T,>(url: string): Promise<ApiResult<T>> => {
    let body: ApiResult<T>;
    try {
      const res = await fetch(url);
      body = (await res.json()) as ApiResult<T>;
    } catch {
      body = { ok: false, error: "Could not reach the Lookthrough server. Check your connection." };
    }
    counter.current += 1;
    setLog((l) => [...l, { n: counter.current, at: new Date().toISOString(), route: url, ok: body.ok, error: body.ok ? undefined : body.error, meta: body.meta }]);
    return body;
  }, []);

  useEffect(() => {
    saveHoldings(holdings);
  }, [holdings]);

  const idsKey = useMemo(() => [...new Set(holdings.map((h) => h.id))].sort((a, b) => a - b).join(","), [holdings]);

  const refresh = useCallback(async () => {
    if (!idsKey) return;
    const res = await call<Quote[]>(`/api/quotes?ids=${idsKey}`);
    if (!res.ok) {
      setNotice(`Prices could not be loaded: ${res.error}`);
      return;
    }
    setQuotes((prev) => {
      const next = { ...prev };
      for (const q of res.data) next[q.id] = q;
      return next;
    });
    setLastQuote({ source: res.meta.source, at: res.meta.cmcTimestamp });
  }, [call, idsKey]);

  // Fetch prices now, then every 2 minutes while the tab is visible.
  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [refresh]);

  async function loadSample() {
    setLoadingSample(true);
    setNotice(null);
    const symbols = SAMPLE.map((s) => s.symbol).join(",");
    const resolved = await call<Record<string, CoinRef>>(`/api/resolve?symbols=${symbols}`);
    if (!resolved.ok) {
      setLoadingSample(false);
      setNotice(`The sample portfolio could not load: ${resolved.error}`);
      return;
    }
    const found = SAMPLE.filter((s) => resolved.data[s.symbol]);
    const missing = SAMPLE.filter((s) => !resolved.data[s.symbol]).map((s) => s.symbol);
    const ids = found.map((s) => resolved.data[s.symbol].id).sort((a, b) => a - b).join(",");
    const q = ids ? await call<Quote[]>(`/api/quotes?ids=${ids}`) : null;
    const priceById = new Map<number, number | null>(q && q.ok ? q.data.map((x) => [x.id, x.price]) : []);
    if (q && q.ok) {
      setQuotes(Object.fromEntries(q.data.map((x) => [x.id, x])));
      setLastQuote({ source: q.meta.source, at: q.meta.cmcTimestamp });
    }
    setHoldings(
      found.map((s) => {
        const coin = resolved.data[s.symbol];
        const price = priceById.get(coin.id) ?? null;
        return { id: coin.id, symbol: coin.symbol, name: coin.name, quantity: s.quantity, buyPrice: price !== null ? +(price * s.costFactor).toPrecision(6) : null };
      }),
    );
    setNotice(
      `Sample portfolio loaded with ${q && q.ok && q.meta.source === "snapshot" ? "saved CoinMarketCap prices (live data unavailable)" : "live CoinMarketCap prices"}. Buy prices are illustrative.${missing.length ? ` Not found on CoinMarketCap right now: ${missing.join(", ")}.` : ""}`,
    );
    setLoadingSample(false);
  }

  function addHolding(h: Holding) {
    setHoldings((prev) => {
      const existing = prev.find((p) => p.id === h.id);
      if (!existing) return [...prev, h];
      // Same token again: combine amounts, and average the buy price when both are known.
      const quantity = existing.quantity + h.quantity;
      const buyPrice =
        existing.buyPrice !== null && h.buyPrice !== null ? (existing.buyPrice * existing.quantity + h.buyPrice * h.quantity) / quantity : (existing.buyPrice ?? h.buyPrice);
      return prev.map((p) => (p.id === h.id ? { ...p, quantity, buyPrice } : p));
    });
  }

  const positions: Position[] = useMemo(
    () =>
      holdings
        .filter((h) => quotes[h.id]?.price != null)
        .map((h) => ({ id: h.id, symbol: h.symbol, name: h.name, value: (quotes[h.id].price as number) * h.quantity, ...lookThrough(h.symbol, h.name) })),
    [holdings, quotes],
  );

  const underlying = useMemo(() => byUnderlying(positions), [positions]);
  const issuers = useMemo(() => byIssuer(positions), [positions]);
  const colors = useMemo(() => colorMap(underlying), [underlying]);
  const total = positions.reduce((s, p) => s + p.value, 0);
  const withCost = holdings.filter((h) => h.buyPrice !== null && quotes[h.id]?.price != null);
  const pnl = withCost.reduce((s, h) => s + ((quotes[h.id].price as number) - (h.buyPrice as number)) * h.quantity, 0);
  const hard = positions.filter((p) => isHardToSell(exitCheck(p.value, quotes[p.id]?.volume24h ?? null)));
  const bets = countBets(positions);

  const warnings = [
    ...hiddenConcentration(underlying, UNDERLYING_WARN).map(
      (g) => `${pct(g.share, 0)} of your money is one bet on ${g.label}, spread across ${g.symbols.join(" and ")}.`,
    ),
    ...issuers
      .filter((g) => g.share >= ISSUER_WARN)
      .map((g) => `${g.label} stands behind ${pct(g.share, 0)} of your money (${g.symbols.join(", ")}). If ${g.label} fails, all of it is affected at once.`),
    ...hard.map((p) => {
      const e = exitCheck(p.value, quotes[p.id]?.volume24h ?? null);
      return Number.isFinite(e.daysToExit)
        ? `Your ${p.symbol} position (${usd(p.value)}) is ${pct(e.shareOfDailyVolume, 0)} of a whole day's trading. Selling it calmly would take ${Math.round(e.daysToExit)} days.`
        : `${p.symbol} shows no tracked trading volume, so there may be no market to sell your ${usd(p.value)} into.`;
    }),
  ];

  const underlyingOf = (h: Holding) => lookThrough(h.symbol, h.name).underlying;
  const empty = holdings.length === 0;

  return (
    <>
      <header className="top">
        <p className="wordmark">Lookthrough</p>
        {lastQuote && (
          <p className={`freshness src-${lastQuote.source}`}>
            {lastQuote.source === "snapshot" ? "Saved snapshot, CoinMarketCap unreachable" : "Live CoinMarketCap prices"}, updated {timeAgo(lastQuote.at)}
          </p>
        )}
      </header>

      <main>
        {empty ? (
          <section className="hero">
            <h1>See what your tokens really own, and whether you could sell them.</h1>
            <p className="hero-sub">
              For anyone holding crypto and tokenised gold, stocks or treasuries together. Lookthrough regroups your holdings by what they represent, shows which issuers
              you depend on, and checks each position against real trading volume from CoinMarketCap.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={loadSample} disabled={loadingSample}>
                {loadingSample ? "Loading live prices" : "Try it with a sample portfolio"}
              </button>
              <a className="btn btn-lg" href="#add">
                Add my own holdings
              </a>
            </div>
            <p className="muted small">No sign-up. Your holdings stay in this browser.</p>
          </section>
        ) : (
          (
            <section className="hero">
              {positions.length > 0 ? (
                <h1 className="verdict">
                  You hold {positions.length} {positions.length === 1 ? "token" : "tokens"}. You own {bets} {bets === 1 ? "bet" : "bets"}.{" "}
                  {hard.length > 0 ? `And you can't quickly sell ${hard.length} of them.` : "And all of them sell easily."}
                </h1>
              ) : (
                <h1 className="verdict">Loading prices from CoinMarketCap…</h1>
              )}
              <dl className="figures">
                <div>
                  <dt>Total value</dt>
                  <dd>{usd(total)}</dd>
                </div>
                <div>
                  <dt>Profit / loss</dt>
                  <dd className={withCost.length ? (pnl >= 0 ? "gain" : "loss") : ""}>{withCost.length ? signedUsd(pnl) : "—"}</dd>
                </div>
                <div>
                  <dt>Largest single bet</dt>
                  <dd>{underlying[0] ? `${underlying[0].label}, ${pct(underlying[0].share, 0)}` : "—"}</dd>
                </div>
              </dl>
              <div className="hero-actions">
                <button type="button" className="btn" onClick={loadSample} disabled={loadingSample}>
                  {loadingSample ? "Loading" : "Reload sample portfolio"}
                </button>
                <button type="button" className="btn" onClick={() => { setHoldings([]); setQuotes({}); setNotice(null); }}>
                  Clear portfolio
                </button>
              </div>
            </section>
          )
        )}

        {notice && <p className="notice" role="status">{notice}</p>}

        {warnings.length > 0 && (
          <section className="block warnings" aria-labelledby="w-title">
            <h2 id="w-title">What stands out</h2>
            <ul>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </section>
        )}

        {positions.length > 0 && <Lookthrough positions={positions} underlying={underlying} colors={colors} />}
        {holdings.length > 0 && <HoldingsTable holdings={holdings} quotes={quotes} colors={colors} underlyingOf={underlyingOf} onRemove={(id) => setHoldings((p) => p.filter((h) => h.id !== id))} />}
        {positions.length > 0 && <Issuers issuers={issuers} />}

        <AddHolding call={call} onAdd={addHolding} />
        <ApiLog entries={log} />
      </main>

      <footer className="foot">
        <p>
          Market data from the CoinMarketCap API. Built for Build with CMC. Not financial advice: volumes are CoinMarketCap&apos;s reported 24-hour totals, and the
          selling pace is a rule of thumb.
        </p>
      </footer>
    </>
  );
}
