"use client";
import { useState } from "react";
import type { ApiResult, CoinRef, Holding } from "@/lib/types";
import PasteHoldings from "./PasteHoldings";

interface Props {
  call: <T>(url: string) => Promise<ApiResult<T>>;
  onAdd: (h: Holding) => void;
  onAddMany: (holdings: Holding[]) => void;
}

export default function AddHolding({ call, onAdd, onAddMany }: Props) {
  const [symbol, setSymbol] = useState("");
  const [matches, setMatches] = useState<CoinRef[] | null>(null);
  const [picked, setPicked] = useState<CoinRef | null>(null);
  const [amount, setAmount] = useState("");
  const [buy, setBuy] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function find() {
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    setBusy(true);
    setMsg(null);
    setPicked(null);
    const res = await call<CoinRef[]>(`/api/symbol?symbol=${encodeURIComponent(s)}`);
    setBusy(false);
    if (!res.ok) return setMsg(res.error);
    if (res.data.length === 0) return setMsg(`CoinMarketCap has no active token with the ticker ${s}.`);
    setMatches(res.data);
    if (res.data.length === 1) setPicked(res.data[0]);
  }

  function add() {
    const q = Number(amount);
    const b = buy.trim() === "" ? null : Number(buy);
    if (!picked) return setMsg("Choose which token you mean.");
    if (!Number.isFinite(q) || q <= 0) return setMsg("Enter how many you hold, as a number above zero.");
    if (b !== null && (!Number.isFinite(b) || b < 0)) return setMsg("Buy price must be a number, or leave it empty.");
    onAdd({ id: picked.id, symbol: picked.symbol, name: picked.name, quantity: q, buyPrice: b });
    setSymbol("");
    setMatches(null);
    setPicked(null);
    setAmount("");
    setBuy("");
    setMsg(`Added ${picked.symbol}.`);
  }

  return (
    <section className="block" id="add" aria-labelledby="add-title">
      <h2 id="add-title">Add your holdings</h2>
      <div className="add-row">
        <label>
          Ticker
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} onKeyDown={(e) => e.key === "Enter" && find()} placeholder="PAXG" autoCapitalize="characters" />
        </label>
        <button type="button" className="btn" onClick={find} disabled={busy || !symbol.trim()}>
          {busy ? "Looking up" : "Look up"}
        </button>
      </div>

      {matches && matches.length > 1 && (
        <fieldset className="matches">
          <legend>Several tokens use this ticker. Which one?</legend>
          {matches.slice(0, 6).map((m) => (
            <label key={m.id} className="match">
              <input type="radio" name="match" checked={picked?.id === m.id} onChange={() => setPicked(m)} />
              {m.name} <span className="muted">{m.rank ? `rank ${m.rank}` : "unranked"}</span>
            </label>
          ))}
        </fieldset>
      )}

      {picked && (
        <div className="add-row">
          <label>
            Amount of {picked.symbol}
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2.5" />
          </label>
          <label>
            Buy price per unit, USD (optional)
            <input inputMode="decimal" value={buy} onChange={(e) => setBuy(e.target.value)} placeholder="2400" />
          </label>
          <button type="button" className="btn btn-primary" onClick={add}>
            Add holding
          </button>
        </div>
      )}
      {msg && <p className="form-msg" role="status">{msg}</p>}
      <PasteHoldings call={call} onAddMany={onAddMany} />
    </section>
  );
}
