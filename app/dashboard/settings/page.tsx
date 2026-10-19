'use client';

import { useEffect, useState } from 'react';
import { Check, CreditCard, LoaderCircle, Trash2 } from 'lucide-react';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import PaymentMethodIcon from '../../../components/ui/PaymentMethodIcon';

const avatars = Array.from({ length: 8 }, (_, index) => `/avatars/boy${index + 1}.png`);
type Profile = { avatar_url?: string | null; payment_method?: string | null; payment_account_name?: string | null; payment_account_number?: string | null };

export default function Settings() {
  const [profile, setProfile] = useState<Profile>({});
  const [method, setMethod] = useState('jazzcash');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' }).then((response) => response.json()).then((result) => {
      const current = result.profile || {};
      setProfile(current);
      setMethod(current.payment_method || 'jazzcash');
      setName(current.payment_account_name || '');
      setNumber(current.payment_account_number || '');
    }).catch(() => setMessage('Could not load your settings.'));
  }, []);

  async function save(body: Record<string, unknown>, success: string) {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save changes.');
      setProfile((current) => ({ ...current, ...body }));
      setMessage(success);
    } catch (error: any) {
      setMessage(error.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment() {
    if (!window.confirm('Delete your saved payment method? You will need to add one before withdrawing.')) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/profile', { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not delete payment details.');
      setProfile((current) => ({ ...current, payment_method: null, payment_account_name: null, payment_account_number: null }));
      setName('');
      setNumber('');
      setMessage('Payment method deleted.');
    } catch (error: any) {
      setMessage(error.message || 'Could not delete payment details.');
    } finally {
      setSaving(false);
    }
  }

  const methodName = profile.payment_method ? ({ jazzcash: 'JazzCash', easypaisa: 'Easypaisa', bank: 'Bank' }[profile.payment_method] || profile.payment_method) : 'No payment method saved';

  return (
    <DashboardShell>
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg"><CreditCard /></div>
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Account</p><h1 className="text-3xl font-black">Settings</h1><p className="mt-1 text-sm text-slate-500">Manage your avatar and payout method.</p></div>
      </div>
      {message && <div role="status" className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</div>}

      <section className="mt-7 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Personalize</p><h2 className="mt-1 text-xl font-black">Change Avatar</h2></div><span className="text-xs font-bold text-slate-400">8 avatars</span></div>
        <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-8">
          {avatars.map((url, index) => {
            const selected = profile.avatar_url === url;
            return <button key={url} type="button" disabled={saving} onClick={() => save({ avatar_url: url }, 'Avatar updated.')} aria-label={`Choose avatar ${index + 1}`} aria-pressed={selected} className={`relative rounded-full p-1 transition hover:-translate-y-1 disabled:opacity-60 ${selected ? 'ring-4 ring-emerald-400 ring-offset-2' : 'ring-1 ring-slate-200'}`}>
              <img src={url} alt={`Avatar ${index + 1}`} className="aspect-square w-full rounded-full object-cover" />
              {selected && <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white"><Check className="h-3 w-3" /></span>}
            </button>;
          })}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Payouts</p><h2 className="mt-1 text-xl font-black">Payment Method</h2><p className="mt-1 text-sm text-slate-500">Withdrawals use these saved details.</p></div>
          {profile.payment_method && <button type="button" disabled={saving} onClick={deletePayment} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="mr-1 inline h-4 w-4" />Delete</button>}
        </div>
        {profile.payment_method && <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4"><PaymentMethodIcon method={(profile.payment_method as 'jazzcash' | 'easypaisa' | 'bank') || 'jazzcash'} /><div><p className="font-bold">{methodName}</p><p className="text-sm text-slate-500">{profile.payment_account_name} · {profile.payment_account_number}</p></div></div>}
        <form onSubmit={(event) => { event.preventDefault(); save({ payment_method: method, payment_account_name: name.trim(), payment_account_number: number.trim() }, 'Payment method saved.'); }} className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-bold text-slate-500"><span className="flex items-center gap-2">Method <PaymentMethodIcon method={method as 'jazzcash' | 'easypaisa' | 'bank'} /></span><select value={method} onChange={(event) => setMethod(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900"><option value="jazzcash">JazzCash</option><option value="easypaisa">Easypaisa</option><option value="bank">Bank</option></select></label>
          <label className="text-xs font-bold text-slate-500">Account name<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} className="mt-1 block w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900" placeholder="Name on account" /></label>
          <label className="text-xs font-bold text-slate-500">Account number<input value={number} onChange={(event) => setNumber(event.target.value)} required minLength={5} className="mt-1 block w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900" placeholder="Wallet or bank number" /></label>
          <button disabled={saving} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-3 font-bold text-white shadow-md disabled:opacity-60 sm:col-span-3">{saving ? <><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Saving…</> : profile.payment_method ? 'Save Changes' : 'Save Payment Method'}</button>
        </form>
      </section><section className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Legal & Security</p><div className="mt-3 flex flex-wrap gap-4 text-sm font-bold text-emerald-700"><a href="/terms">Terms & Conditions</a><a href="/privacy">Privacy Policy</a><a href="/security">Security Policy</a></div></section>
    </DashboardShell>
  );
}
