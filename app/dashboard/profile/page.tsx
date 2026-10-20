'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, CircleDollarSign, Copy, Gamepad2, History, Settings, WalletCards } from 'lucide-react';
import DashboardShell from '../../../components/dashboard/DashboardShell';

type ProfileData = {
  profile?: { id?: string; full_name?: string; username?: string; referral_code?: string; avatar_url?: string };
  wallet?: { coin_balance?: number; red_pocket_balance?: number };
  submissions?: Array<{ status: string }>;
  transactions?: Array<{ id: string }>;
  user?: { id?: string; email?: string };
};

export default function Profile() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [usernameCopied, setUsernameCopied] = useState(false);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then(setData)
      .catch(() => setData({}));
  }, []);

  if (!data) return <DashboardShell><div className="rounded-3xl bg-white p-8 text-slate-500">Loading your dashboard…</div></DashboardShell>;

  const profile = data.profile || {};
  const wallet = data.wallet || {};
  const userId = profile.id || data.user?.id || '';
  const username = profile.username || profile.referral_code || 'mecashuser';
  async function copyUsername() {
    try { await navigator.clipboard.writeText(username); }
    catch {
      const element = document.createElement('textarea');
      element.value = username;
      document.body.appendChild(element);
      element.select();
      document.execCommand('copy');
      element.remove();
    }
    setUsernameCopied(true);
    window.setTimeout(() => setUsernameCopied(false), 1800);
  }
  const completedTasks = data.submissions?.filter((submission) => submission.status === 'approved').length || 0;
  const coins = Number(wallet.coin_balance || 0);
  const redPockets = Number(wallet.red_pocket_balance || 0);

  const actions = [
    { href: '/dashboard/wallet', title: 'My Wallet', description: `${coins.toLocaleString()} Coins · ${redPockets.toLocaleString()} RP`, icon: WalletCards, accent: 'from-amber-400 to-orange-500', tag: 'BALANCE' },
    { href: '/dashboard/withdraw', title: 'Withdraw', description: `${redPockets.toLocaleString()} Red Pocket available`, icon: CircleDollarSign, accent: 'from-rose-500 to-red-700', tag: 'CASH OUT' },
    { href: '/dashboard/game-history', title: 'Game History', description: `${completedTasks} approved tasks completed`, icon: Gamepad2, accent: 'from-sky-500 to-indigo-600', tag: 'TASKS' },
    { href: '/dashboard/transactions', title: 'Transaction History', description: 'Track rewards, exchanges and withdrawals', icon: History, accent: 'from-emerald-500 to-teal-700', tag: 'ACTIVITY' },
  ];

  return (
    <DashboardShell>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#101b35] via-[#123a46] to-[#075c55] p-4 text-white shadow-xl sm:p-4">
        <div className="pointer-events-none absolute -right-14 -top-20 h-64 w-64 rounded-full border-[36px] border-white/5" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <img src={profile.avatar_url || '/avatars/boy1.png'} alt="Profile avatar" className="h-14 w-14 shrink-0 rounded-full border-3 border-amber-300 object-cover shadow-lg sm:h-20 sm:w-20" />
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-200">Player profile</p>
              <h1 className="mt-2 truncate text-xl font-black sm:text-3xl">{profile.full_name || 'Me Cash Player'}</h1>
              <div className="mt-1 flex items-center gap-2"><p className="truncate font-bold text-emerald-100">@{username}</p><button type="button" onClick={() => void copyUsername()} title="Copy username" aria-label="Copy username" className="grid h-4 w-4 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/10 text-emerald-100 hover:bg-white/20">{usernameCopied ? <span className="text-xs font-black">✓</span> : <Copy className="h-3.5 w-3.5" />}</button></div>
              <p className="mt-1 truncate font-mono text-[11px] text-white/55">UID: {userId || '—'}</p>
            </div>
          </div>
          <Link href="/dashboard/settings" aria-label="Settings" title="Settings" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20">
            <Settings className="h-5 w-5" />
          </Link>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-1.5 text-xs"><span className="text-white/55">Coins</span><b className="ml-2 text-amber-200">{coins.toLocaleString()}</b></div>
          <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-1.5 text-xs"><span className="text-white/55">Red Pocket</span><b className="ml-2 text-rose-200">{redPockets.toLocaleString()} RP</b></div>
        </div>
      </section>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Your account</p><h2 className="mt-1 text-xl font-black text-slate-900">Quick access</h2></div>
        <p className="hidden text-sm text-slate-500 sm:block">Choose where to go next</p>
      </div>
      <section className="mt-3 grid grid-cols-2 gap-3">
        {actions.map(({ href, title, description, icon: Icon, accent, tag }) => (
          <Link key={href} href={href} className="group flex min-h-32 flex-col items-start gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg sm:p-4">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-lg`}><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[10px] font-black tracking-[0.2em] text-slate-400">{tag}</span><span className="mt-1 block text-sm font-black text-slate-900">{title}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{description}</span></span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-emerald-600" />
          </Link>
        ))}
      </section>
    </DashboardShell>
  );
}
