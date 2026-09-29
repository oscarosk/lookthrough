import { CHAIN_WARN, NATIVE, type ChainGroup } from "@/lib/chains";
import { pct, usd } from "@/lib/format";

export default function Chains({ chains }: { chains: ChainGroup[] }) {
  if (chains.length === 0) return null;
  const max = Math.max(...chains.map((g) => g.share));
  return (
    <section className="block" aria-labelledby="ch-title">
      <h2 id="ch-title">Where your tokens live</h2>
      <p className="lede">
        Each token is issued on a blockchain, and a problem with a chain (an outage, congestion, a bridge failure) hits every token on it at once. Main chain per
        token, from CoinMarketCap.
      </p>
      <ul className="issuers">
        {chains.map((g) => (
          <li key={g.label} className={g.label !== NATIVE && g.share >= CHAIN_WARN ? "is-warn" : undefined}>
            <div className="iss-head">
              <span className="iss-name">{g.label}</span>
              <span className="iss-val">
                {pct(g.share, 0)} <span className="muted">({usd(g.value)})</span>
              </span>
            </div>
            <div className="iss-track">
              <div className="iss-fill" style={{ width: `${(g.share / max) * 100}%` }} />
            </div>
            <p className="iss-tokens">{g.symbols.join(", ")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
