"use client";
import { useState } from "react";
import { parsePasted } from "@/lib/share";
import type { ApiResult, CoinRef, Holding } from "@/lib/types";

interface Props {
  call: <T>(url: string) => Promise<ApiResult<T>>;
  onAddMany: (holdings: Holding[]) => void;
}

export default function PasteHoldings({ call, onAddMany }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function add() {
    const { lines, bad } = parsePasted(text);
    if (lines.length === 0) {
      setMsg("Write one holding per line, like BTC 0.5 or PAXG 2 @ 3900.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const symbols = [...new Set(lines.map((l) => l.symbol))].slice(0, 40);
    const res = await call<Record<string, CoinRef>>(`/api/resolve?symbols=${encodeURIComponent(symbols.join(","))}`);
    setBusy(false);
    if (!res.ok) {
      setMsg(`Could not look up those tickers: ${res.error}`);
      return;
    }
    const added: Holding[] = [];
    const missing: string[] = [];
    for (const l of lines) {
      const coin = res.data[l.symbol];
      if (!coin) missing.push(l.symbol);
      else added.push({ id: coin.id, symbol: coin.symbol, name: coin.name, quantity: l.quantity, buyPrice: l.buyPrice });
    }
    if (added.length) onAddMany(added);
    const parts = [
      added.length ? `Added ${added.map((h) => `${h.symbol} (${h.name})`).join(", ")}.` : "",
      missing.length ? `Not found on CoinMarketCap: ${[...new Set(missing)].join(", ")}.` : "",
      bad.length ? `Could not read: ${bad.join("; ")}.` : "",
      added.length ? "Where several tokens share a ticker, the highest-ranked one was used. If that is not yours, remove it and use Look up instead." : "",
    ].filter(Boolean);
    setMsg(parts.join(" "));
    if (added.length && !missing.length && !bad.length) setText("");
  }

  return (
    <div className="paste">
      <label htmlFor="paste-box" className="paste-label">
        Or paste several at once, one per line. Add a buy price after @ if you know it.
      </label>
      <textarea id="paste-box" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={"BTC 0.5\nPAXG 2 @ 3900\nNVDAX 10"} spellCheck={false} />
      <button type="button" className="btn" onClick={add} disabled={busy || !text.trim()}>
        {busy ? "Adding" : "Add all"}
      </button>
      {msg && (
        <p className="form-msg" role="status">
          {msg}
        </p>
      )}
    </div>
  );
}
