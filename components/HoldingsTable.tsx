import { exitCheck, GRADE_LABEL, PARTICIPATION } from "@/lib/exitCheck";
import { days, pct, qty, signedUsd, usd } from "@/lib/format";
import type { Holding, Quote } from "@/lib/types";

interface Props {
  holdings: Holding[];
  quotes: Record<number, Quote>;
  colors: Map<string, string>;
  underlyingOf: (h: Holding) => string;
  onRemove: (id: number) => void;
}

export default function HoldingsTable({ holdings, quotes, colors, underlyingOf, onRemove }: Props) {
  return (
    <section className="block" aria-labelledby="h-title">
      <h2 id="h-title">Could you sell it?</h2>
      <p className="lede">
        Each position compared with the token&apos;s real 24-hour trading volume on CoinMarketCap. Selling more than about {pct(PARTICIPATION, 0)} of a day&apos;s volume
        usually moves the price against you, so that is the pace assumed here.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Token</th>
              <th scope="col" className="num">Amount</th>
              <th scope="col" className="num">Price</th>
              <th scope="col" className="num">Value</th>
              <th scope="col" className="num">Profit / loss</th>
              <th scope="col" className="num">24h volume</th>
              <th scope="col">Selling it</th>
              <th scope="col"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const q = quotes[h.id];
              const price = q?.price ?? null;
              const value = price !== null ? price * h.quantity : null;
              const pnl = value !== null && h.buyPrice !== null ? value - h.buyPrice * h.quantity : null;
              const exit = value !== null ? exitCheck(value, q?.volume24h ?? null) : null;
              return (
                <tr key={h.id}>
                  <th scope="row">
                    <span className="swatch" style={{ background: colors.get(underlyingOf(h)) ?? "#999" }} />
                    <span className="tok-sym">{h.symbol}</span>
                    <span className="tok-name">{h.name}</span>
                  </th>
                  <td className="num">{qty(h.quantity)}</td>
                  <td className="num">{q ? usd(price) : <span className="muted">loading</span>}</td>
                  <td className="num">{usd(value)}</td>
                  <td className={`num ${pnl === null ? "" : pnl >= 0 ? "gain" : "loss"}`}>{pnl === null ? <span className="muted">no buy price</span> : signedUsd(pnl)}</td>
                  <td className="num">{usd(q?.volume24h ?? null, { compact: true })}</td>
                  <td>
                    {exit ? (
                      <div className="exit">
                        <span className={`grade grade-${exit.grade}`}>{GRADE_LABEL[exit.grade]}</span>
                        <span className="exit-note">
                          {Number.isFinite(exit.shareOfDailyVolume)
                            ? `${exit.shareOfDailyVolume < 0.0001 ? "Under 0.01%" : pct(exit.shareOfDailyVolume, exit.shareOfDailyVolume < 0.01 ? 2 : 1)} of a day's volume, ${days(exit.daysToExit)}`
                            : "No tracked trading volume"}
                        </span>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <button type="button" className="link-btn" onClick={() => onRemove(h.id)} aria-label={`Remove ${h.symbol}`}>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
