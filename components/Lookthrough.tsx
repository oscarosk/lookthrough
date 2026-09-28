import { pct, usd } from "@/lib/format";
import type { Group, Position } from "@/lib/exposure";

interface Props {
  positions: Position[];
  underlying: Group[];
  colors: Map<string, string>;
}

function Bar({ segments, label }: { segments: { key: string; name: string; share: number; color: string; value: number }[]; label: string }) {
  return (
    <div>
      <p className="bar-label">{label}</p>
      <div className="bar" role="img" aria-label={`${label}: ${segments.map((s) => `${s.name} ${pct(s.share, 0)}`).join(", ")}`}>
        {segments.map((s) => (
          <div key={s.key} className="bar-seg" style={{ flexGrow: s.share, background: s.color }} title={`${s.name}: ${usd(s.value)} (${pct(s.share)})`}>
            {s.share >= 0.09 && <span>{s.name}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Lookthrough({ positions, underlying, colors }: Props) {
  const total = positions.reduce((s, p) => s + p.value, 0);
  // Tokens ordered so wrappers of the same underlying sit side by side.
  const order = new Map(underlying.map((g, i) => [g.label, i]));
  const tokens = [...positions]
    .filter((p) => p.value > 0)
    .sort((a, b) => (order.get(a.underlying)! - order.get(b.underlying)!) || b.value - a.value);

  return (
    <section className="block" aria-labelledby="lt-title">
      <h2 id="lt-title">What you hold, and what it really is</h2>
      <p className="lede">Top bar: each token. Bottom bar: the same money regrouped by what the tokens represent. Same colour means same underlying bet.</p>
      <div className="bars">
        <Bar
          label="By token"
          segments={tokens.map((p) => ({ key: `t${p.id}`, name: p.symbol, share: total ? p.value / total : 0, color: colors.get(p.underlying) ?? "#999", value: p.value }))}
        />
        <Bar
          label="By underlying"
          segments={underlying.map((g) => ({ key: `u${g.label}`, name: g.label, share: g.share, color: colors.get(g.label) ?? "#999", value: g.value }))}
        />
      </div>
      <ul className="legend">
        {underlying.map((g) => (
          <li key={g.label}>
            <span className="swatch" style={{ background: colors.get(g.label) }} />
            <span className="legend-name">{g.label}</span>
            <span className="legend-val">{pct(g.share, 0)}</span>
            <span className="legend-sub">{g.symbols.join(", ")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
