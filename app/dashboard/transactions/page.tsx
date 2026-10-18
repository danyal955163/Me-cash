'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ReceiptText } from 'lucide-react';
import DashboardShell from '../../../components/dashboard/DashboardShell';

type Transaction = { id: string; type: string; amount: number; description?: string | null; created_at: string };

function transactionIcon(type: string) {
  if (type === 'withdrawal') return ArrowUpRight;
  if (type === 'exchange') return ArrowLeftRight;
  return ArrowDownLeft;
}

export default function TransactionHistoryPage() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' }).then((response) => response.json()).then((data) => {
      setItems((data.transactions || []).slice().sort((a: Transaction, b: Transaction) => +new Date(b.created_at) - +new Date(a.created_at)));
    }).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell>
      <Link href="/dashboard/profile" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-700"><ArrowLeft className="h-4 w-4" />Profile</Link>
      <div className="mt-4 flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-800 text-white shadow-lg"><ReceiptText /></span><div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Wallet activity</p><h1 className="text-3xl font-black text-slate-900">Transaction History</h1><p className="mt-1 text-sm text-slate-500">Rewards, exchanges and withdrawals for your account.</p></div></div>
      <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
        {loading ? <p className="text-sm text-slate-400">Loading transactions…</p> : items.length ? <div className="divide-y divide-slate-100">{items.map((item) => { const Icon = transactionIcon(item.type); return <article key={item.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-50 text-emerald-700"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-900">{item.description || item.type.replaceAll('_', ' ')}</b><span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</span></div><div className="text-right"><span className={`font-black ${Number(item.amount) < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{Number(item.amount) > 0 ? '+' : ''}{Number(item.amount).toLocaleString()}</span><span className="ml-1 text-[10px] font-bold uppercase text-slate-400">{item.type === 'exchange' ? 'Coins' : item.type === 'withdrawal' ? 'RP' : 'Coins'}</span></div></article>; })}</div> : <div className="py-10 text-center"><ReceiptText className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-700">No transactions yet</p><p className="mt-1 text-sm text-slate-500">Wallet activity will show here when it happens.</p></div>}
      </section>
    </DashboardShell>
  );
}
