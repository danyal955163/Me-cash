'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase-browser';

type Mode = 'login' | 'signup' | 'forgot';
type FormState = { name: string; phone: string; email: string; password: string; confirm: string; referral: string };

export default function AuthCard({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ name: '', phone: '', email: '', password: '', confirm: '', referral: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) setForm((current) => ({ ...current, referral: ref.trim() }));
  }, []);

  function set(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (mode === 'signup' && form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    setBusy(true);
    if (mode === 'signup') {
      const referral = (new URLSearchParams(window.location.search).get('ref') || form.referral).trim();
      const signupUrl = new URL('/api/signup', window.location.origin);
      if (referral) signupUrl.searchParams.set('ref', referral);
      try {
        const response = await fetch(signupUrl.toString(), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            full_name: form.name.trim(),
            phone: form.phone.trim(),
            username: `mecash${Math.floor(100 + Math.random() * 900)}`,
          }),
        });
        const result = await response.json();
        setBusy(false);
        if (!response.ok) {
          setError(result.error || 'Signup could not be completed.');
          return;
        }
        if (!result.hasSession) {
          setMessage('Account created. Check your email to confirm, then login.');
          return;
        }
        router.push('/dashboard/profile');
        router.refresh();
      } catch {
        setBusy(false);
        setError('Signup could not be completed. Please try again.');
      }
      return;
    }

    const supabase = createClient();
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      : await supabase.auth.resetPasswordForEmail(form.email.trim(), { redirectTo: `${window.location.origin}/login` });

    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (mode === 'forgot') {
      setMessage('Check your inbox for the reset link.');
      return;
    }
    router.push('/dashboard/profile');
    router.refresh();
  }

  if (mode === 'forgot' && message) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-600">✓</div>
        <h2 className="mt-5 text-2xl font-extrabold">Check your inbox</h2>
        <p className="mt-2 text-slate-500">{message}</p>
        <Link href="/login" className="mt-6 inline-block font-bold text-emerald-600">Back to login</Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-7 shadow-2xl md:p-9">
      <h2 className="text-3xl font-extrabold">{mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}</h2>
      <p className="mt-2 text-sm text-slate-500">{mode === 'login' ? 'Continue your earning journey.' : mode === 'signup' ? 'Start earning in under a minute.' : 'Enter your email and we’ll send a reset link.'}</p>
      {error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      <form onSubmit={submit} className="mt-7 space-y-4">
        {mode === 'signup' && <>
          <Field label="Full Name" placeholder="Muhammad Ali" value={form.name} onChange={(value) => set('name', value)} />
          <Field label="Phone" placeholder="+92 300 1234567" value={form.phone} onChange={(value) => set('phone', value)} />
        </>}
        <Field label="Email" placeholder="you@example.com" type="email" value={form.email} onChange={(value) => set('email', value)} />
        {mode !== 'forgot' && <Field label="Password" placeholder="••••••••" type="password" value={form.password} onChange={(value) => set('password', value)} />}
        {mode === 'signup' && <>
          <Field label="Confirm Password" placeholder="••••••••" type="password" value={form.confirm} onChange={(value) => set('confirm', value)} />
          <Field label="Referral Username (optional)" placeholder="ME-1234" value={form.referral} onChange={(value) => set('referral', value)} />
        </>}
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" required={mode === 'signup'} className="accent-emerald-500" />
          {mode === 'signup' ? 'I agree to the Terms & Privacy Policy' : 'Remember me'}
          {mode === 'login' && <Link href="/forgot-password" className="ml-auto font-bold text-emerald-600">Forgot password?</Link>}
        </label>
        <button disabled={busy} className="w-full rounded-2xl bg-emerald-500 py-3.5 font-bold text-white shadow-glow transition hover:scale-[1.01] disabled:bg-slate-300">
          {busy ? 'Please wait…' : mode === 'login' ? 'Login →' : mode === 'signup' ? 'Create Account →' : 'Send Reset Link'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        {mode === 'login' ? <>Don’t have an account? <Link href="/signup" className="font-bold text-emerald-600">Sign Up</Link></> : mode === 'signup' ? <>Already have an account? <Link href="/login" className="font-bold text-emerald-600">Login</Link></> : <Link href="/login" className="font-bold text-emerald-600">← Back to login</Link>}
      </p>
    </div>
  );
}

function Field({ label, placeholder, type = 'text', value, onChange }: { label: string; placeholder: string; type?: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input required={label !== 'Referral Username (optional)'} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" placeholder={placeholder} type={type} />
    </label>
  );
}
