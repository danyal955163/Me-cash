'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import { Award, Check, ChevronRight, Coins, Copy, Gift, LoaderCircle, MessageCircle, MoreHorizontal, Send, Share2, Sparkles, Trophy, Users, X } from 'lucide-react';

type ReferralRow = { is_reward_active?: boolean; referred_tasks_count?: number; total_coins_earned?: number; total_red_pocket_earned?: number };
type LeaderboardEntry = { rank: number; name: string; avatarUrl: string | null; invites: number; coinsEarned: number; redPocketEarned: number };

const eventRules = [
  { title: 'Invite your friends', description: 'Share your personal invite link. Your friend needs to sign up through your link so their account is connected to you.', icon: Send, color: 'bg-orange-100 text-orange-700' },
  { title: 'Earn as they complete tasks', description: 'Get 500 Coins for every approved task they complete, plus 1 Red Pocket on every 5th task. Rewards count for up to 30 tasks per friend.', icon: Coins, color: 'bg-amber-100 text-amber-700' },
  { title: 'Enjoy lifetime earnings', description: 'The referral program also includes 5% lifetime earnings under the Me Cash referral rules.', icon: Gift, color: 'bg-rose-100 text-rose-700' },
];
const rankStyles = [
  'border-amber-300 bg-gradient-to-br from-yellow-200 to-amber-400 text-amber-950 shadow-amber-200/70',
  'border-slate-200 bg-gradient-to-br from-slate-100 to-slate-300 text-slate-800 shadow-slate-200/70',
  'border-orange-200 bg-gradient-to-br from-orange-100 to-orange-300 text-orange-900 shadow-orange-100/70',
  'border-violet-100 bg-violet-50 text-violet-800',
  'border-sky-100 bg-sky-50 text-sky-800',
];

export default function ReferralPage() {
  const [code, setCode] = useState('mecashuser');
  const [origin, setOrigin] = useState('https://me-cash.vercel.app');
  const [stats, setStats] = useState({ total: 0, tasks: 0, coins: 0, redPocket: 0, active: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let mounted = true;
    setOrigin(window.location.origin);
    async function load() {
      try {
        const [meResponse, referralsResponse, leaderboardResponse] = await Promise.all([
          fetch('/api/me', { cache: 'no-store' }),
          fetch('/api/referrals', { cache: 'no-store' }),
          fetch('/api/referrals/leaderboard', { cache: 'no-store' }),
        ]);
        const [me, referrals, leaderboardResult] = await Promise.all([
          meResponse.json(), referralsResponse.json(), leaderboardResponse.json(),
        ]);
        if (!mounted) return;
        setCode(me.profile?.username || me.profile?.referral_code || 'mecashuser');
        const rows: ReferralRow[] = referrals.data || [];
        setStats({
          total: rows.length,
          tasks: rows.reduce((sum, row) => sum + Number(row.referred_tasks_count || 0), 0),
          coins: rows.reduce((sum, row) => sum + Number(row.total_coins_earned || 0), 0),
          redPocket: rows.reduce((sum, row) => sum + Number(row.total_red_pocket_earned || 0), 0),
          active: rows.filter((row) => row.is_reward_active).length,
        });
        if (leaderboardResponse.ok) setLeaderboard(leaderboardResult.data || []);
        else setLeaderboardError(leaderboardResult.error || 'Leaderboard is temporarily unavailable.');
      } catch {
        if (mounted) setLeaderboardError('Could not load referral details. Please refresh.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const link = useMemo(() => `${origin}/signup?ref=${encodeURIComponent(code)}`, [origin, code]);
  const shareText = `Join Me Cash and earn money by completing simple tasks! Use my link: ${link}`;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  async function copyText(value: string, message: string) {
    try { await navigator.clipboard.writeText(value); }
    catch {
      const element = document.createElement('textarea');
      element.value = value;
      element.setAttribute('readonly', '');
      element.style.position = 'fixed';
      element.style.opacity = '0';
      document.body.appendChild(element);
      element.select();
      document.execCommand('copy');
      element.remove();
    }
    setCopied(true);
    showToast(message);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function openShare(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function shareMore() {
    if (navigator.share) {
      setSharing(true);
      try { await navigator.share({ title: 'Join Me Cash', text: 'Join Me Cash and earn money by completing simple tasks!', url: link }); }
      catch (error) { if ((error as Error).name !== 'AbortError') showToast('Could not open sharing options.'); }
      finally { setSharing(false); }
    } else {
      await copyText(shareText, 'Invite message and link copied.');
    }
  }

  const totalRewardText = `${stats.coins.toLocaleString()} Coins · ${stats.redPocket.toLocaleString()} RP`;
  const rankLabel = (rank: number) => rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl space-y-7 pb-5 sm:space-y-9">
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fff1a6] via-[#ffc857] to-[#ff984d] p-5 shadow-[0_20px_60px_rgba(238,148,44,.22)] sm:rounded-[2.5rem] sm:p-9">
          <div className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full border-[28px] border-white/20" />
          <div className="pointer-events-none absolute bottom-[-5rem] left-[42%] h-44 w-44 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[43%] sm:block">
            <Image src="/images/referral-coins.webp" alt="Gold coins and gift reward illustration" fill priority sizes="(max-width: 640px) 0px, 360px" className="object-contain object-right-bottom drop-shadow-xl" />
          </div>
          <div className="pointer-events-none absolute -right-2 top-2 h-28 w-28 opacity-25 sm:hidden"><Image src="/images/referral-coins.webp" alt="" fill sizes="112px" className="object-contain" /></div>

          <div className="relative max-w-[650px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/55 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-orange-800 shadow-sm sm:text-xs"><Sparkles className="h-3.5 w-3.5" />Me Cash Invite Event</div>
            <h1 className="mt-4 max-w-[560px] text-[2rem] font-black leading-[1.03] tracking-tight text-[#4a2415] sm:text-5xl">Invite 1 Friend,<br className="hidden sm:block" /> Earn Coins + RP</h1>
            <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-[#653d21] sm:text-base">Earn up to <strong>15,000 Coins + 6 Red Pockets</strong> as one friend completes their first 30 approved tasks.</p>

            <div className="mt-5 max-w-md rounded-2xl border border-white/70 bg-white/75 p-3 shadow-lg shadow-orange-900/5 backdrop-blur sm:mt-7 sm:p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-orange-700">Your invitation code</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="min-w-0 flex-1 break-all text-lg font-black tracking-wide text-slate-900 sm:text-xl">{code}</span>
                <button type="button" onClick={() => void copyText(code, 'Invitation code copied.')} aria-label="Copy invitation code" title="Copy invitation code" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#1c1c1c] text-white transition hover:bg-orange-700"><Copy className="h-4 w-4" /></button>
              </div>
            </div>
            <button type="button" onClick={() => setShareOpen(true)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#171717] px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-orange-900/15 transition hover:-translate-y-0.5 hover:bg-[#30251e] sm:mt-5 sm:w-auto sm:min-w-48 sm:py-4">Invite Now<ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="relative mt-5 flex items-center gap-2 text-xs font-bold text-[#73471e] sm:mt-6"><Users className="h-4 w-4" />{stats.active.toLocaleString()} active referral rewards</div>
        </section>

        <section aria-label="Invitation details" className="rounded-[2rem] border border-orange-100 bg-white p-4 shadow-[0_12px_40px_rgba(112,67,30,.06)] sm:p-6">
          <div className="mb-4 flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-700"><Award className="h-5 w-5" /></span><div><h2 className="font-black text-slate-900">Invitation Details</h2><p className="text-xs text-slate-500">Your referral progress at a glance</p></div></div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-[#fff4cc] to-[#ffebae] p-4 sm:p-5"><p className="text-xs font-bold text-amber-800">Friends Invited</p><p className="mt-1 text-3xl font-black text-[#5c3513] sm:text-4xl">{loading ? '—' : stats.total.toLocaleString()}</p><p className="mt-1 text-[11px] text-amber-900/70">successful sign-ups</p></div>
            <div className="rounded-2xl bg-gradient-to-br from-[#ffe5d8] to-[#ffd8c1] p-4 sm:p-5"><p className="text-xs font-bold text-orange-800">Rewards Earned</p><p className="mt-1 break-words text-xl font-black leading-tight text-[#652d16] sm:text-3xl">{loading ? '—' : totalRewardText}</p><p className="mt-1 text-[11px] text-orange-900/70">Coins + Red Pockets</p></div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#fff9ed] px-4 py-3"><div><p className="text-[11px] font-semibold text-slate-500">Total earnings from referrals</p><p className="mt-0.5 text-sm font-black text-slate-900">{loading ? 'Loading…' : `${stats.coins.toLocaleString()} Coins and ${stats.redPocket.toLocaleString()} RP`}</p></div><Coins className="h-6 w-6 shrink-0 text-amber-500" /></div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_12px_40px_rgba(58,40,96,.07)]">
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#f3eaff] via-[#f8f2ff] to-[#fff2e3] px-5 py-4 sm:px-6 sm:py-5"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-700">Community leaders</p><h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">Invite Ranking</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm"><Trophy className="h-5 w-5" /></span></div>
          <div className="p-4 sm:p-6">
            <div className="hidden grid-cols-[56px_1fr_110px_150px] gap-3 px-3 pb-3 text-[10px] font-black uppercase tracking-wider text-slate-400 sm:grid"><span>Rank</span><span>Member</span><span className="text-right">Invites</span><span className="text-right">Earnings</span></div>
            {loading ? <div className="space-y-3">{[1,2,3].map((item) => <div key={item} className="h-[72px] animate-pulse rounded-2xl bg-slate-100" />)}</div> : leaderboardError ? <p className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{leaderboardError}</p> : leaderboard.length ? <div className="space-y-2">{leaderboard.map((entry) => <div key={entry.rank} className={`grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-2xl border p-3 sm:grid-cols-[56px_1fr_110px_150px] sm:gap-3 ${rankStyles[entry.rank - 1]}`}>
              <div className={`grid h-9 w-9 place-items-center rounded-full border text-xs font-black shadow-sm sm:h-10 sm:w-10 ${rankStyles[entry.rank - 1]}`}><span className="sm:hidden">{entry.rank}</span><span className="hidden sm:inline">{rankLabel(entry.rank)}</span></div>
              <div className="flex min-w-0 items-center gap-2.5"><div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">{entry.avatarUrl ? <Image src={entry.avatarUrl} alt="" fill sizes="40px" unoptimized className="object-cover" /> : <div className="grid h-full w-full place-items-center text-slate-400"><Users className="h-5 w-5" /></div>}</div><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{entry.name}</p><p className="text-[10px] font-bold text-slate-500 sm:hidden">{entry.coinsEarned.toLocaleString()} Coins · {entry.redPocketEarned.toLocaleString()} RP</p></div></div>
              <div className="text-right"><p className="text-lg font-black text-slate-900">{entry.invites.toLocaleString()}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:hidden">invites</p></div>
              <div className="hidden text-right sm:block"><p className="text-sm font-black text-slate-900">{entry.coinsEarned.toLocaleString()} Coins</p><p className="text-[11px] font-bold text-slate-500">{entry.redPocketEarned.toLocaleString()} RP</p></div>
            </div>)}</div> : <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 px-4 py-8 text-center"><Trophy className="mx-auto h-8 w-8 text-violet-300" /><p className="mt-2 font-bold text-slate-700">No invite rankings yet</p><p className="mt-1 text-xs text-slate-500">Be the first to invite friends to Me Cash.</p></div>}
          </div>
        </section>

        <section className="rounded-[2rem] border border-amber-100 bg-gradient-to-br from-[#fff9e8] via-white to-[#fff0e7] p-5 shadow-[0_12px_40px_rgba(112,67,30,.05)] sm:p-7">
          <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-orange-700">Simple steps, real rewards</p><h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Event Rules</h2></div><Gift className="mb-1 h-8 w-8 text-orange-400" /></div>
          <div className="mt-5 space-y-3">{eventRules.map((rule, index) => { const Icon = rule.icon; return <div key={rule.title} className="flex gap-3 rounded-2xl border border-white bg-white/90 p-4 shadow-sm"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${rule.color}`}><Icon className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Step {index + 1}</p><h3 className="mt-0.5 font-black text-slate-900">{rule.title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{rule.description}</p></div></div>; })}</div>
          <button type="button" onClick={() => setDetailsOpen(true)} className="mt-4 inline-flex items-center gap-1 text-sm font-black text-orange-800 hover:text-orange-950">View Details<ChevronRight className="h-4 w-4" /></button>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#fbbd44] via-[#ffab53] to-[#fb8965] px-5 py-7 text-center shadow-[0_18px_45px_rgba(245,142,60,.2)] sm:px-8"><span className="pointer-events-none absolute -left-7 -top-10 h-32 w-32 rounded-full border-[18px] border-white/15" /><h2 className="relative text-2xl font-black text-[#4a2415]">Your next friend could be your next reward.</h2><p className="relative mt-1 text-sm font-semibold text-[#6c4026]">Share your link and start earning together.</p><button type="button" onClick={() => setShareOpen(true)} className="relative mt-4 inline-flex min-w-56 items-center justify-center gap-2 rounded-2xl bg-[#171717] px-7 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#30251e]">Invite Now<ChevronRight className="h-4 w-4" /></button></section>
      </div>

      {toast && <div role="status" className="fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-2xl">{toast}</div>}

      {shareOpen && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onClick={() => setShareOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-white p-5 pb-8 shadow-2xl sm:rounded-[2rem] sm:p-7">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" /><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-orange-700">Grow your circle</p><h2 id="share-title" className="mt-1 text-2xl font-black text-slate-900">Share Your Invite Link</h2><p className="mt-1 max-w-sm text-sm leading-5 text-slate-500">Send the link to friends and earn invite rewards when they complete tasks.</p></div><button type="button" onClick={() => setShareOpen(false)} aria-label="Close share sheet" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X className="h-5 w-5" /></button></div>
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-amber-800">Your full referral link</p><p className="mt-1 break-all text-sm font-bold leading-6 text-slate-800">{link}</p></div>
        <button type="button" onClick={() => void copyText(shareText, 'Invite message and full link copied.')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#171717] px-5 py-4 text-sm font-black text-white shadow-lg hover:bg-[#332a22]">{copied ? <Check className="h-5 w-5" /> : <Gift className="h-5 w-5" />}{copied ? 'Copied!' : 'Copy message + link'}</button>
        <p className="mt-2 break-words text-center text-[11px] leading-5 text-slate-500">Copies: “{shareText}”</p>
        <div className="mt-5 grid grid-cols-4 gap-2.5">
          <button type="button" onClick={() => openShare(`https://wa.me/?text=${encodeURIComponent(shareText)}`)} className="flex flex-col items-center gap-2 rounded-2xl bg-[#e8f9ef] p-3 text-xs font-black text-[#12834a] hover:bg-[#d5f3e2]"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#25D366] text-white"><MessageCircle className="h-5 w-5" /></span>WhatsApp</button>
          <button type="button" onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(shareText)}`)} className="flex flex-col items-center gap-2 rounded-2xl bg-[#edf4ff] p-3 text-xs font-black text-[#1d5aa6] hover:bg-[#dfebff]"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#1877F2] text-lg font-black text-white">f</span>Facebook</button>
          <button type="button" onClick={() => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`)} className="flex flex-col items-center gap-2 rounded-2xl bg-slate-100 p-3 text-xs font-black text-slate-800 hover:bg-slate-200"><span className="grid h-11 w-11 place-items-center rounded-full bg-black text-sm font-black text-white">X</span>Twitter / X</button>
          <button type="button" onClick={() => void shareMore()} disabled={sharing} className="flex flex-col items-center gap-2 rounded-2xl bg-violet-50 p-3 text-xs font-black text-violet-800 hover:bg-violet-100 disabled:opacity-60"><span className="grid h-11 w-11 place-items-center rounded-full bg-violet-600 text-white">{sharing ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}</span>More</button>
        </div>
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400"><Share2 className="h-3.5 w-3.5" />Share your link with people you know</div>
      </section></div>}

      {detailsOpen && <div className="fixed inset-0 z-[75] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onClick={() => setDetailsOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-orange-700">Me Cash referral program</p><h2 id="rules-title" className="mt-1 text-2xl font-black text-slate-900">Reward Details</h2></div><button type="button" onClick={() => setDetailsOpen(false)} aria-label="Close reward details" className="rounded-xl border border-slate-200 p-2 text-slate-500"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-3">{eventRules.map((rule, index) => <div key={rule.title} className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-black text-orange-800">{index + 1}. {rule.title}</p><p className="mt-1 text-sm leading-6 text-slate-700">{rule.description}</p></div>)}</div><p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">Referral bonuses are credited for approved task completions and follow the Me Cash referral program limits.</p><button type="button" onClick={() => setDetailsOpen(false)} className="mt-5 w-full rounded-xl bg-slate-900 py-3 font-bold text-white">Got it</button></section></div>}
    </DashboardShell>
  );
}
