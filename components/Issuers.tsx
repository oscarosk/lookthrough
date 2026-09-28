import { pct, usd } from "@/lib/format";
import { ISSUER_WARN, type Group } from "@/lib/exposure";

export default function Issuers({ issuers }: { issuers: Group[] }) {
  if (issuers.length === 0) return null;
  const max = Math.max(...issuers.map((g) => g.share));
  return (
    <section className="block" aria-labelledby="iss-title">
      <h2 id="iss-title">Who you are trusting</h2>
      <p className="lede">Wrapped and tokenised assets depend on an issuer holding the real thing. Native coins like BTC and ETH are left out.</p>
      <ul className="issuers">
        {issuers.map((g) => (
          <li key={g.label} className={g.share >= ISSUER_WARN ? "is-warn" : undefined}>
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
