'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Clock3, LoaderCircle, Pencil, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import PaymentMethodIcon from '../../../components/ui/PaymentMethodIcon';

type PaymentMethod = 'jazzcash' | 'easypaisa' | 'bank';
type Profile = { payment_method?: PaymentMethod | null; payment_account_name?: string | null; payment_account_number?: string | null };
type Withdrawal = { id: string; status: string; amount?: number; red_pocket_amount?: number; created_at: string };
const methods: Array<{ value: PaymentMethod; label: string }> = [{ value: 'jazzcash', label: 'JazzCash' }, { value: 'easypaisa', label: 'Easypaisa' }, { value: 'bank', label: 'Bank' }];

export default function WithdrawPage() {
  const [profile, setProfile] = useState<Profile>({});
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState('200');
  const [method, setMethod] = useState<PaymentMethod>('jazzcash');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const response = await fetch('/api/me', { cache: 'no-store' });
      const data = await response.json();
      const currentProfile = data.profile || {};
      setProfile(currentProfile);
      setBalance(Number(data.wallet?.red_pocket_balance || 0));
      setHistory((data.withdrawals || []).slice().sort((a: Withdrawal, b: Withdrawal) => +new Date(b.created_at) - +new Date(a.created_at)));
      setMethod(currentProfile.payment_method || 'jazzcash');
      setAccountName(currentProfile.payment_account_name || '');
      setAccountNumber(currentProfile.payment_account_number || '');
    } catch {
      setError('Could not load withdrawal details. Refresh and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const hasSavedMethod = Boolean(profile.payment_method && profile.payment_account_name && profile.payment_account_number);
  const hasPending = history.some((item) => item.status === 'pending');
  const selectedAmount = Number(amount);
  const canWithdraw = hasSavedMethod && selectedAmount >= 200 && selectedAmount <= balance && !hasPending;
  const methodLabel = useMemo(() => methods.find((item) => item.value === profile.payment_method)?.label || 'Payment method', [profile.payment_method]);
  const maskedNumber = profile.payment_account_number ? (profile.payment_account_number.length > 6 ? `${profile.payment_account_number.slice(0, 3)}****${profile.payment_account_number.slice(-3)}` : profile.payment_account_number) : '';

  async function savePayment(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ payment_method: method, payment_account_name: accountName.trim(), payment_account_number: accountNumber.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save payment details.');
      const nextProfile = data.profile || { ...profile, payment_method: method, payment_account_name: accountName.trim(), payment_account_number: accountNumber.trim() };
      setProfile(nextProfile);
      setMethod(nextProfile.payment_method || method);
      setAccountName(nextProfile.payment_account_name || accountName.trim());
      setAccountNumber(nextProfile.payment_account_number || accountNumber.trim());
      setEditOpen(false);
      setMessage('Payment method saved. You can continue with your withdrawal.');
    } catch (exception: any) {
      setError(exception.message || 'Could not save payment details.');
    } finally {
      setSaving(false);
    }
  }

  async function submitWithdrawal(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!canWithdraw) {
      setError(hasPending ? 'You already have a pending withdrawal request.' : 'Enter an amount of at least 200 RP within your available balance.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/withdrawals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ amount: selectedAmount, red_pocket_amount: selectedAmount, method, account_name: accountName.trim(), account_number: accountNumber.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Withdrawal could not be submitted.');
      setMessage('Withdrawal request submitted. You can follow its status below.');
      await load();
    } catch (exception: any) {
      setError(exception.message || 'Withdrawal could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  const paymentForm = (dialog = false) => (
    <form onSubmit={savePayment} className="grid gap-3 sm:grid-cols-3">
      <label className="text-xs font-bold text-slate-500"><span className="flex items-center gap-2">Payment method <PaymentMethodIcon method={method} /></span><select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900">{methods.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-500">Account name<input value={accountName} onChange={(event) => setAccountName(event.target.value)} required minLength={2} className="mt-1 block w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900" placeholder="Name on account" /></label>
      <label className="text-xs font-bold text-slate-500">Account number<input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} required minLength={5} className="mt-1 block w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900" placeholder="Wallet or bank number" /></label>
      <button disabled={saving} className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white disabled:opacity-60 sm:col-span-3">{saving ? 'Saving…' : dialog ? 'Save Changes' : 'Save & Continue'}</button>
    </form>
  );

  return (
    <DashboardShell>
      <Link href="/dashboard/profile" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-700"><ArrowLeft className="h-4 w-4" />Profile</Link>
      <div className="mt-4 flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-rose-700">Red Pocket</p><h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">Withdraw</h1><p className="mt-2 text-sm text-slate-500">Send your available balance to your saved payout method.</p></div><div className="rounded-2xl bg-rose-50 px-4 py-3 text-right"><p className="text-xs font-bold text-rose-700">Available</p><b className="text-2xl font-black text-rose-950">{balance.toLocaleString()} RP</b></div></div>

      <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Payout destination</p><h2 className="mt-1 text-lg font-black text-slate-900">Payment method</h2></div>{hasSavedMethod && <ShieldCheck className="h-6 w-6 text-emerald-600" />}</div>
        {hasSavedMethod ? <button type="button" onClick={() => setEditOpen(true)} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-emerald-300"><PaymentMethodIcon method={profile.payment_method || method} /><span className="min-w-0 flex-1"><b className="block text-slate-900">{methodLabel}</b><span className="block text-sm text-slate-500">{maskedNumber} · {profile.payment_account_name}</span></span><Pencil className="h-4 w-4 text-slate-400" /><ChevronRight className="h-4 w-4 text-slate-400" /></button> : <div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="mb-4 text-sm font-semibold text-slate-700">Add a payout method to continue. Your details will be saved for future withdrawals.</p>{paymentForm()}</div>}
      </section>

      <form onSubmit={submitWithdrawal} className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
        <div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Withdrawal amount</p><h2 className="mt-1 text-xl font-black text-slate-900">How much would you like to withdraw?</h2></div>
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-emerald-500"><input type="number" inputMode="decimal" min={200} max={balance} step="1" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={!hasSavedMethod || balance < 200} className="min-w-0 flex-1 bg-transparent text-3xl font-black outline-none disabled:text-slate-300" aria-label="Withdrawal amount in Red Pocket" /><span className="font-black text-rose-700">RP</span></div>
        <div className="mt-3 grid grid-cols-4 gap-2">{[200, 500, 1000].map((quickAmount) => <button key={quickAmount} type="button" disabled={!hasSavedMethod || balance < quickAmount} onClick={() => setAmount(String(quickAmount))} className={`rounded-xl border px-2 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-35 ${Number(amount) === quickAmount ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}>{quickAmount.toLocaleString()}</button>)}<button type="button" disabled={!hasSavedMethod || balance < 200} onClick={() => setAmount(String(Math.floor(balance)))} className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-3 text-sm font-black text-rose-700 disabled:cursor-not-allowed disabled:opacity-35">Full</button></div>
        <p className="mt-3 text-xs text-slate-500">Minimum withdrawal: 200 RP. Only your saved payment method will be used.</p>
        {balance < 200 && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">You need at least 200 RP to request a withdrawal.</p>}
        {hasPending && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">A withdrawal is already pending. Wait for it to be processed before requesting another.</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
        <button disabled={!canWithdraw || submitting || loading} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 py-4 text-lg font-black text-white shadow-lg shadow-rose-200 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500">{submitting ? <><LoaderCircle className="mr-2 inline h-5 w-5 animate-spin" />Submitting…</> : 'Withdraw'}</button>
      </form>

      <section id="history" className="mt-6 scroll-mt-24 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Your account</p><h2 className="mt-1 text-xl font-black text-slate-900">Withdrawal history</h2></div><Clock3 className="h-5 w-5 text-slate-400" /></div>
        {loading ? <p className="mt-5 text-sm text-slate-400">Loading history…</p> : history.length ? <div className="mt-4 divide-y divide-slate-100">{history.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-4"><div><b className="block text-slate-900">{Number(item.red_pocket_amount ?? item.amount ?? 0).toLocaleString()} RP</b><span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</span></div><span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${item.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : item.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{item.status}</span></div>)}</div> : <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">No withdrawal requests yet.</p>}
      </section>

      {editOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-payment-title"><div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Payout settings</p><h2 id="edit-payment-title" className="mt-1 text-xl font-black">Change saved method</h2></div><button type="button" onClick={() => setEditOpen(false)} className="rounded-xl border px-3 py-2 text-sm font-bold text-slate-500">Close</button></div>{paymentForm(true)}</div></div>}
    </DashboardShell>
  );
}
