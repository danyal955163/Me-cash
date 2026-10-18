'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeftRight, ArrowUpFromLine, History, ReceiptText } from 'lucide-react';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import ExchangeModal from '../../../components/dashboard/ExchangeModal';

type Wallet = { coin_balance?: number; red_pocket_balance?: number; total_coins_earned?: number; total_coins_exchanged?: number; total_red_pocket_withdrawn?: number };

function BalanceCircle({ title, amount, detail, color, icon, progress }: { title: string; amount: number; detail: string; color: string; icon: string; progress: number }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-white bg-white p-5 shadow-sm sm:p-7">
      <div className="relative grid h-48 w-48 place-items-center rounded-full p-3 sm:h-56 sm:w-56" style={{ background: `conic-gradient(${color} ${progress}%, #edf2f7 ${progress}% 100%)` }}>
        <div className="grid h-full w-full place-items-center rounded-full border-[10px] border-white bg-gradient-to-br from-slate-50 to-white text-center shadow-inner">
          <div><span className="text-4xl">{icon}</span><p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{title}</p><b className="mt-1 block text-2xl font-black text-slate-900 sm:text-3xl">{amount.toLocaleString()}</b><p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p></div>
        </div>
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Available balance</p>
    </div>
  );
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet>({});
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadWallet() {
    try {
      const response = await fetch('/api/me', { cache: 'no-store' });
      const result = await response.json();
      setWallet(result.wallet || {});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWallet();
    const onFocus = () => loadWallet();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const coins = Number(wallet.coin_balance || 0);
  const redPocket = Number(wallet.red_pocket_balance || 0);
  const milestones = [200000, 500000, 1000000].filter((value) => value <= coins);

  const shortcuts = [
    { label: 'Withdraw', detail: 'Red Pocket', icon: ArrowUpFromLine, disabled: false, href: '/dashboard/withdraw' },
    { label: 'Withdrawal History', detail: 'Your requests', icon: History, disabled: false, href: '/dashboard/withdraw#history' },
  ];

  return (
    <DashboardShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Me Cash · Wallet</p><h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">Your balances</h1><p className="mt-2 text-sm text-slate-500">Exchange Coins at available milestones; withdraw Red Pocket to your saved method.</p></div>
        <button onClick={loadWallet} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:border-emerald-300">{loading ? 'Loading…' : 'Refresh'}</button>
      </div>

      <section className="mt-7 grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <BalanceCircle title="Coins Balance" amount={coins} detail="Coins" color="#f59e0b" icon="🪙" progress={Math.min(100, Math.max(8, Math.round((coins / 1000000) * 100)))} />
        <div className="flex justify-center py-2 lg:px-2">
          <button onClick={() => setExchangeOpen(true)} disabled={!milestones.length} className="group flex min-h-16 w-full max-w-sm items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 text-base font-black text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none lg:w-60">
            <ArrowLeftRight className="h-6 w-6 transition group-hover:rotate-180" />Transfer Coins to Red Pocket
          </button>
        </div>
        <BalanceCircle title="Red Pocket Balance" amount={redPocket} detail="RP · cash value" color="#e11d48" icon="🧧" progress={Math.min(100, Math.max(8, redPocket ? Math.round((redPocket / Math.max(redPocket, 1000)) * 100) : 8))} />
      </section>

      <section className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {shortcuts.map(({ label, detail, icon: Icon, disabled, href }) => {
          const content = <><span className={`grid h-11 w-11 place-items-center rounded-xl ${disabled ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-700'}`}><Icon className="h-5 w-5" /></span><span><b className="block text-sm text-slate-800">{label}</b><small className="mt-0.5 block text-xs text-slate-400">{detail}</small></span></>;
          return disabled ? <div key={label} aria-disabled="true" title="Deposits are not available" className="flex cursor-not-allowed items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 opacity-75 sm:p-4">{content}</div> : <Link key={label} href={href} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md sm:p-4">{content}</Link>;
        })}
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-100 p-5"><p className="text-xs font-black uppercase tracking-widest text-amber-800">Exchange guide</p><p className="mt-2 font-bold text-slate-800">Available milestones: 200,000 · 500,000 · 1,000,000 Coins</p><p className="mt-1 text-sm text-slate-600">Each 1,000 Coins exchanges for 1 Red Pocket.</p></div>
        <Link href="/dashboard/transactions" className="flex items-center justify-between rounded-3xl bg-white p-5 shadow-sm transition hover:shadow-md"><div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Account activity</p><p className="mt-2 font-bold text-slate-800">View all transaction history</p></div><ReceiptText className="h-6 w-6 text-emerald-700" /></Link>
      </section>

      {exchangeOpen && <ExchangeModal coins={coins} onClose={() => setExchangeOpen(false)} onDone={(updated) => { setWallet((current) => ({ ...current, ...updated })); loadWallet(); }} />}
    </DashboardShell>
  );
}
