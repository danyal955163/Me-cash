'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

type WalletUpdate = { coin_balance: number; red_pocket_balance: number };
const EXCHANGE_MILESTONES = [200000, 500000, 1000000];

export default function ExchangeModal({ coins, onClose, onDone }: { coins: number; onClose: () => void; onDone: (balance: WalletUpdate) => void }) {
  const eligible = useMemo(() => EXCHANGE_MILESTONES.filter((amount) => amount <= coins), [coins]);
  const [selected, setSelected] = useState(eligible[eligible.length - 1] || 200000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eligible.includes(selected) && eligible.length) setSelected(eligible[eligible.length - 1]);
  }, [eligible, selected]);

  function snapToMilestone(value: number) {
    if (!eligible.length) return;
    const next = eligible.reduce((best, amount) => Math.abs(amount - value) < Math.abs(best - value) ? amount : best, eligible[0]);
    setSelected(next);
  }

  async function submit() {
    if (!eligible.includes(selected)) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/exchange', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ milestone: selected }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Exchange could not be completed.');
      onDone(result.wallet);
      onClose();
    } catch (exception: any) {
      setError(exception.message || 'Exchange failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="exchange-title">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-[#11263b] to-[#07584f] p-6 text-white"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-emerald-200">Wallet transfer</p><h2 id="exchange-title" className="mt-1 text-2xl font-black">Coins to Red Pocket</h2></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-xl bg-white/10 p-2"><X className="h-5 w-5" /></button></div><p className="mt-2 text-sm text-white/70">Choose a valid exchange milestone.</p></div>
        <div className="p-6">
          {eligible.length === 0 ? <div className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">You need at least 200,000 Coins. Current balance: {coins.toLocaleString()}.</div> : <>
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Selected exchange</p><p className="mt-1 text-3xl font-black text-slate-900">{selected.toLocaleString()} <span className="text-sm text-slate-400">Coins</span></p></div><div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 font-black text-rose-700"><ArrowRight className="h-4 w-4" />{(selected / 1000).toLocaleString()} RP</div></div>
            <input aria-label="Choose coin exchange milestone" type="range" min={200000} max={Math.max(coins, 200000)} step={1000} value={selected} disabled={eligible.length < 2} onChange={(event) => snapToMilestone(Number(event.target.value))} className="mt-7 h-2 w-full cursor-pointer accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-50" />
            <div className="mt-2 flex justify-between text-xs font-bold text-slate-400"><span>200,000 minimum</span><span>Your balance: {coins.toLocaleString()}</span></div>
            <div className="mt-5 grid grid-cols-3 gap-2">{eligible.map((amount) => <button type="button" key={amount} onClick={() => setSelected(amount)} className={`rounded-xl border p-3 text-xs font-black transition ${selected === amount ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:border-emerald-300'}`}>{amount.toLocaleString()} Coins<br/><span className="mt-1 inline-block font-semibold text-rose-600">= {amount / 1000} RP</span></button>)}</div>
          </>}
          {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
          <button type="button" disabled={!eligible.length || busy} onClick={submit} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 py-4 font-black text-white shadow-lg disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500">{busy ? 'Transferring…' : 'Confirm Transfer'}</button>
          <p className="mt-3 text-center text-xs text-slate-400">Server accepts 200,000 · 500,000 · 1,000,000 Coin milestones only.</p>
        </div>
      </div>
    </div>
  );
}
