'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Search, X } from 'lucide-react';
import MessageUserButton from '../../../components/admin/MessageUserButton';
import PaymentMethodIcon from '../../../components/ui/PaymentMethodIcon';

type Row = {
  id: string;
  status: string;
  red_pocket_amount: number;
  amount: number;
  method: string;
  account_name: string;
  account_number: string;
  created_at: string;
  profiles?: { id?: string; full_name: string; email: string; phone?: string; referral_code?: string; username?: string };
};
type Toast = { message: string; kind: 'success' | 'error' };

export default function Withdrawals() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Row | null>(null);
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = useCallback((message: string, kind: Toast['kind']) => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/withdrawals?status=${encodeURIComponent(filter)}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || result.error) throw new Error(result.error || 'Could not load withdrawals.');
    setRows(result.data || []);
  }, [filter]);

  useEffect(() => {
    void load().catch((error: unknown) => showToast(error instanceof Error ? error.message : 'Could not load withdrawals.', 'error'));
  }, [load, showToast]);

  async function confirm() {
    if (!selected || !mode || submitting) return;
    const action = mode;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/withdrawals/${selected.id}/${action}`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.error) {
        showToast(result.error || `Failed to ${action} withdrawal.`, 'error');
        return;
      }

      const nextStatus = action === 'approve' ? 'approved' : 'rejected';
      setRows((current) => current
        .map((row) => row.id === selected.id ? { ...row, status: nextStatus } : row)
        .filter((row) => filter === 'all' || row.status === filter));
      setSelected(null);
      setMode(null);
      router.refresh();
      showToast(action === 'approve' ? 'Withdrawal approved.' : 'Withdrawal rejected.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Action failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast('Copied.', 'success');
    } catch {
      showToast('Could not copy value.', 'error');
    }
  }

  const filtered = rows.filter((row) => {
    const query = search.toLowerCase();
    return !query || [row.profiles?.full_name, row.profiles?.username, row.profiles?.referral_code, row.profiles?.email]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });

  function details(row: Row) {
    return `Name: ${row.profiles?.full_name || ''}\nEmail: ${row.profiles?.email || ''}\nPhone: ${row.profiles?.phone || ''}\nAccount Name: ${row.account_name}\nAccount Number: ${row.account_number}\nAmount: ${row.red_pocket_amount || row.amount} RP\nMethod: ${row.method}`;
  }

  return <>
    {toast && <div role="status" className={`fixed right-4 top-4 z-[80] max-w-sm rounded-xl px-4 py-3 text-sm font-bold text-white shadow-xl ${toast.kind === 'success' ? 'bg-emerald-700' : 'bg-red-700'}`}>{toast.message}</div>}
    <h1 className="text-3xl font-black">Withdrawals</h1>
    <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3"><Search className="h-4 w-4 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username or email..." className="w-full bg-transparent p-3 text-sm outline-none" /></div>
    <div className="mt-5 flex gap-2">{['all', 'pending', 'approved', 'rejected'].map((value) => <button onClick={() => setFilter(value)} className={`rounded-xl px-4 py-2 text-sm font-bold ${filter === value ? 'bg-red-600' : 'bg-slate-800'}`} key={value}>{value}</button>)}</div>
    <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="border-b border-slate-800 text-xs uppercase text-slate-500"><tr>{['User', 'RP Amount', 'Method', 'Account Name', 'Account Number', 'Requested', 'Status', 'Actions'].map((label) => <th className="px-5 py-4" key={label}>{label}</th>)}</tr></thead>
        <tbody>{filtered.map((row) => <tr className="border-b border-slate-800" key={row.id}>
          <td className="px-5 py-4"><b>{row.profiles?.referral_code || row.profiles?.full_name || 'User'}</b><br /><span className="text-xs text-slate-500">{row.profiles?.email}</span></td>
          <td className="px-5 py-4 font-bold text-red-400">{Number(row.red_pocket_amount || row.amount)} RP</td><td className="px-5 py-4"><span className="inline-flex items-center gap-2"><PaymentMethodIcon method={row.method as 'jazzcash' | 'easypaisa' | 'bank'} /><span className="capitalize">{row.method}</span></span></td><td className="px-5 py-4">{row.account_name}</td>
          <td className="px-5 py-4"><span className="mr-2">{row.account_number}</span><button title="Copy account number" onClick={() => void copy(row.account_number)} className="rounded bg-slate-700 p-1"><Copy className="h-3 w-3" /></button></td>
          <td className="px-5 py-4 text-slate-400">{new Date(row.created_at).toLocaleString()}</td><td className="px-5 py-4">{row.status}</td>
          <td className="px-5 py-4"><button onClick={() => { setSelected(row); setMode(null); }} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold">View</button><MessageUserButton userId={row.profiles?.id} /></td>
        </tr>)}</tbody>
      </table>
      {!filtered.length && <p className="p-10 text-center text-slate-500">No withdrawals found.</p>}
    </div>

    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"><div className="w-full max-w-lg rounded-2xl bg-slate-900 p-6">
      <div className="flex justify-between"><h2 className="text-xl font-black">Withdrawal Details</h2><button onClick={() => setSelected(null)} aria-label="Close details"><X /></button></div>
      <div className="mt-5 space-y-2 text-sm"><p><b>Name:</b> {selected.profiles?.full_name}</p><p><b>Username:</b> {selected.profiles?.username || selected.profiles?.referral_code || '—'}</p><p><b>Email:</b> {selected.profiles?.email}</p><p><b>Phone:</b> {selected.profiles?.phone || '—'}</p><p><b>Amount:</b> {selected.red_pocket_amount || selected.amount} RP</p><div className="flex items-center gap-3 rounded-xl bg-slate-800 p-3"><PaymentMethodIcon method={selected.method as 'jazzcash' | 'easypaisa' | 'bank'} /><span><b className="block capitalize">{selected.method}</b><span className="text-xs text-slate-400">Payout method</span></span></div>
        {([['Method', selected.method], ['Account Name', selected.account_name], ['Account Number', selected.account_number]] as const).map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-800 px-3 py-2"><span><b>{label}:</b> {value}</span><button type="button" title={`Copy ${label}`} onClick={() => void copy(String(value))} className="rounded-md bg-slate-700 p-1.5 hover:bg-slate-600"><Copy className="h-3.5 w-3.5" /></button></div>)}
      </div>
      <div className="mt-5 flex gap-2"><button onClick={() => void copy(details(selected))} className="flex-1 rounded-xl bg-blue-700 py-3 font-bold">Copy Details</button><button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(details(selected))}`, '_blank', 'noopener,noreferrer')} className="flex-1 rounded-xl bg-emerald-700 py-3 font-bold">Transfer</button></div>
      {selected.status === 'pending' && !mode && <div className="mt-6 flex gap-3"><button onClick={() => setMode('approve')} className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold">Approve</button><button onClick={() => setMode('reject')} className="flex-1 rounded-xl bg-red-700 py-3 font-bold">Reject</button></div>}
      {mode === 'approve' && <div className="mt-6"><p className="rounded-xl bg-emerald-950/50 p-3 text-sm text-emerald-200">Review the payout details above, then confirm approval. No transaction ID is required.</p><button disabled={submitting} onClick={() => void confirm()} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 font-bold disabled:opacity-60">{submitting ? 'Saving…' : 'Confirm Approval'}</button><button disabled={submitting} onClick={() => setMode(null)} className="mt-2 w-full rounded-xl bg-slate-700 py-3 font-bold disabled:opacity-60">Cancel</button></div>}
      {mode === 'reject' && <div className="mt-6"><p className="rounded-xl bg-red-950/50 p-3 text-sm text-red-200">Confirm rejection of this withdrawal.</p><button disabled={submitting} onClick={() => void confirm()} className="mt-4 w-full rounded-xl bg-red-700 py-3 font-bold disabled:opacity-60">{submitting ? 'Saving…' : 'Confirm Rejection'}</button><button disabled={submitting} onClick={() => setMode(null)} className="mt-2 w-full rounded-xl bg-slate-700 py-3 font-bold disabled:opacity-60">Cancel</button></div>}
    </div></div>}
  </>;
}
