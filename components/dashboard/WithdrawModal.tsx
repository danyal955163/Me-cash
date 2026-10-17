'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Profile = {
  id?: string;
  payment_method?: string | null;
  payment_account_name?: string | null;
  payment_account_number?: string | null;
};

const methodName: Record<string, string> = { jazzcash: 'JazzCash', easypaisa: 'Easypaisa', bank: 'Bank' };

export default function WithdrawModal({ balance, profile, onClose }: { balance: number; profile: Profile | null; onClose: () => void }) {
  const router = useRouter();
  const [amount, setAmount] = useState(200);
  const [method, setMethod] = useState(profile?.payment_method || 'jazzcash');
  const [name, setName] = useState(profile?.payment_account_name || '');
  const [number, setNumber] = useState(profile?.payment_account_number || '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(Boolean(profile?.payment_method && profile?.payment_account_name && profile?.payment_account_number));
  const [message, setMessage] = useState('');

  async function requestWithdrawal() {
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/withdrawals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ red_pocket_amount: amount, amount, method, account_name: name.trim(), account_number: number.trim() }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (response.ok) {
      alert('Withdrawal request submitted! Processing within 24 hours.');
      onClose();
    } else {
      setMessage(data.error || 'Withdrawal request failed.');
    }
  }

  async function saveAndWithdraw() {
    if (!method || !name.trim() || !number.trim()) {
      setMessage('Please complete all payment details.');
      return;
    }
    if (amount < 200 || amount > balance) {
      setMessage('Enter an amount of at least 200 RP and no more than your available balance.');
      return;
    }
    setBusy(true);
    setMessage('');
    const save = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payment_method: method, payment_account_name: name.trim(), payment_account_number: number.trim() }),
    });
    if (!save.ok) {
      setBusy(false);
      setMessage('Could not save payment details.');
      return;
    }
    setSaved(true);
    await requestWithdrawal();
  }

  const maskedNumber = number.length > 4 ? `•••• ${number.slice(-4)}` : `•••• ${number}`;
  const validAmount = Number.isFinite(amount) && amount >= 200 && amount <= balance;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex justify-between">
          <h2 className="text-xl font-extrabold">Withdraw 🧧</h2>
          <button onClick={onClose} aria-label="Close withdrawal dialog"><X /></button>
        </div>
        <p className="mt-2 text-sm text-slate-500">Balance: {balance} RP · Minimum: 200 RP</p>
        {message && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {[200, 500, 1000].filter((value) => value <= balance).map((value) => (
            <button type="button" key={value} onClick={() => setAmount(value)} aria-pressed={amount === value} className={`rounded-lg px-3 py-2 text-xs font-bold ${amount === value ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`}>
              {value} RP
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Amount (RP)
          <input value={amount} onChange={(event) => setAmount(Number(event.target.value))} type="number" min={200} max={balance} step="1" className="mt-1 w-full rounded-xl border p-3" placeholder="RP amount" />
        </label>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {saved ? <>
            <p className="text-xs font-bold uppercase text-slate-500">Sending to</p>
            <p className="mt-2 font-bold">{methodName[method] || 'JazzCash'} {maskedNumber}</p>
            <p className="text-sm text-slate-600">{name}</p>
            <button type="button" onClick={() => router.push('/dashboard/settings')} className="mt-3 text-sm font-bold text-emerald-700">Change payment details</button>
          </> : <>
            <p className="text-xs font-bold uppercase text-slate-500">Please add payment details to withdraw</p>
            <select value={method} onChange={(event) => setMethod(event.target.value)} className="mt-3 w-full rounded-xl border p-3">
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">Easypaisa</option>
              <option value="bank">Bank</option>
            </select>
            <input value={name} onChange={(event) => setName(event.target.value)} className="mt-3 w-full rounded-xl border p-3" placeholder="Account name" />
            <input value={number} onChange={(event) => setNumber(event.target.value)} className="mt-3 w-full rounded-xl border p-3" placeholder="Account number" />
          </>}
        </div>
        <button disabled={busy || !validAmount} onClick={saved ? requestWithdrawal : saveAndWithdraw} className="mt-5 w-full rounded-xl bg-red-600 py-3 font-bold text-white disabled:bg-slate-300">
          {busy ? 'Please wait…' : saved ? 'Confirm Withdrawal' : 'Save & Withdraw'}
        </button>
      </div>
    </div>
  );
}
