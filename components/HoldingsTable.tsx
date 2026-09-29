import { exitCheck, GRADE_LABEL, PARTICIPATION, type ExitResult } from "@/lib/exitCheck";
import { days, pct, qty, signedUsd, usd } from "@/lib/format";
import type { Holding, Quote, VolumeHistory } from "@/lib/types";

export interface RowNote {
  tokenCount: number;
  priceGap: number | null;
  busier: { symbol: string; issuer: string; volume: number; ratio: number; exit: ExitResult } | null;
  /** For gold and silver tokens: premium over the metal's spot price. */
  spot: { metal: string; gap: number; unit: string } | null;
}

interface Props {
  holdings: Holding[];
  notes: Record<number, RowNote>;
  history: Record<number, VolumeHistory>;
  logos: Record<number, string | null>;
  quotes: Record<number, Quote>;
  colors: Map<string, string>;
  underlyingOf: (h: Holding) => string;
  onRemove: (id: number) => void;
}

export default function HoldingsTable({ holdings, quotes, colors, notes, history, logos, underlyingOf, onRemove }: Props) {
  return (
    <section className="block" aria-labelledby="h-title">
      <h2 id="h-title">Could you sell it?</h2>
      <p className="lede">
        Each position compared with the token&apos;s trading volume on a typical recent day: the median of the last 30 days on CoinMarketCap, so one unusually busy or quiet
        day does not decide the answer. Selling more than about {pct(PARTICIPATION, 0)} of a day&apos;s volume usually moves the price against you, so that is the pace
        assumed here.
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
              <th scope="col" className="num">Daily volume</th>
              <th scope="col">Selling it</th>
              <th scope="col">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const q = quotes[h.id];
              const hist = history[h.id];
              const price = q?.price ?? null;
              const value = price !== null ? price * h.quantity : null;
              const pnl = value !== null && h.buyPrice !== null ? value - h.buyPrice * h.quantity : null;
              const typical = hist && hist.days >= 7 && hist.medianVolume !== null ? hist.medianVolume : null;
              const volume = typical ?? q?.volume24h ?? null;
              const exit = value !== null ? exitCheck(value, volume) : null;
              const dexShare = q?.volume24h && q.dexVolume24h !== null ? q.dexVolume24h / q.volume24h : null;
              return (
                <tr key={h.id}>
                  <th scope="row">
                    <span className="swatch" style={{ background: colors.get(underlyingOf(h)) ?? "#999" }} />
                    {logos[h.id] && (
                      // eslint-disable-next-line @next/next/no-img-element -- small remote logo from CoinMarketCap metadata
                      <img className="tok-logo" src={logos[h.id] as string} alt="" width={18} height={18} loading="lazy" />
                    )}
                    <span className="tok-sym">{h.symbol}</span>
                    <span className="tok-name">{h.name}</span>
                  </th>
                  <td className="num">{qty(h.quantity)}</td>
                  <td className="num">{q ? usd(price) : <span className="muted">loading</span>}</td>
                  <td className="num">{usd(value)}</td>
                  <td className={`num ${pnl === null || Math.abs(pnl) < 0.005 ? "" : pnl > 0 ? "gain" : "loss"}`}>
                    {pnl === null ? <span className="muted">no buy price</span> : signedUsd(pnl)}
                  </td>
                  <td className="num">
                    {usd(volume, { compact: true })}
                    <span className="vol-sub">{typical !== null ? `median of ${hist.days} days; today ${usd(q?.volume24h ?? null, { compact: true })}` : "last 24h"}</span>
                    {dexShare !== null && dexShare > 0.5 && <span className="vol-sub">mostly on DEXs</span>}
                  </td>
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
                    {notes[h.id] && <WrapperNote note={notes[h.id]} symbol={h.symbol} />}
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

function WrapperNote({ note, symbol }: { note: RowNote; symbol: string }) {
  const lines: string[] = [];
  if (note.busier) {
    lines.push(
      `Same asset, busier token: ${note.busier.symbol} (${note.busier.issuer}) trades ${usd(note.busier.volume, { compact: true })} in the last 24 hours, ${Math.round(note.busier.ratio)}× ${symbol}. Held as ${note.busier.symbol}, this position would sell in ${days(note.busier.exit.daysToExit)}.`,
    );
  }
  if (note.spot) {
    const g = note.spot.gap;
    lines.push(
      `${Math.abs(g) < 0.0005 ? "In line with" : `${pct(Math.abs(g), 2)} ${g > 0 ? "above" : "below"}`} the spot price of ${note.spot.metal}${note.spot.unit !== "troy ounce" ? ` (priced per ${note.spot.unit})` : ""}.`,
    );
  }
  if (note.priceGap !== null && Math.abs(note.priceGap) >= 0.005) {
    lines.push(`${symbol} is ${pct(Math.abs(note.priceGap))} ${note.priceGap > 0 ? "above" : "below"} the average price of all ${note.tokenCount} tokens for this asset.`);
  }
  if (lines.length === 0) return null;
  return (
    <ul className="wrapper-note">
      {lines.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
