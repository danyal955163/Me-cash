'use client';

import { useEffect, useState } from 'react';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import { Check, Copy, Facebook, MessageCircle, Share2, Twitter } from 'lucide-react';

const promoMessage = (link: string) => `Join Me Cash and earn money by completing simple tasks!\nUse my referral link to get started:\n${link}`;

export default function Referral() {
  const [code, setCode] = useState('mecashuser');
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });

  useEffect(() => {
    setOrigin(window.location.origin);
    Promise.all([
      fetch('/api/me', { cache: 'no-store' }).then((response) => response.json()),
      fetch('/api/referrals', { cache: 'no-store' }).then((response) => response.json()),
    ]).then(([me, referrals]) => {
      setCode(me.profile?.username || me.profile?.referral_code || 'mecashuser');
      const rows = referrals.data || [];
      setStats({
        total: rows.length,
        active: rows.filter((row: any) => row.is_reward_active).length,
        completed: rows.filter((row: any) => Number(row.referred_tasks_count) >= 30).length,
      });
    });
  }, []);

  const link = origin ? `${origin}/signup?ref=${encodeURIComponent(code)}` : `/signup?ref=${encodeURIComponent(code)}`;
  const shareText = promoMessage(link);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      const element = document.createElement('textarea');
      element.value = shareText;
      element.setAttribute('readonly', '');
      element.style.position = 'fixed';
      element.style.opacity = '0';
      document.body.appendChild(element);
      element.select();
      document.execCommand('copy');
      element.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const share = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <DashboardShell>
      <h1 className="text-4xl font-black">Referral Engine</h1>
      <p className="mt-2 text-slate-500">Invite friends with your personal username referral link.</p>

      <section className="mt-8 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-700">How It Works / Referral Program</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">Earn together with every referral</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            'Invite a friend → Get 50 to 100 coins (Bonus)',
            'When your friend completes any task → You get 500 Coins (up to 30 tasks)',
            'When your friend completes every 5th task (5, 10, 15, 20, 25, 30) → You get 1 Red Pocket',
            '5% Lifetime Earning',
          ].map((rule, index) => (
            <li key={rule} className="flex gap-3 rounded-2xl bg-white p-4 text-sm font-semibold leading-6 text-slate-700 shadow-sm">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 font-black text-emerald-700">{index + 1}</span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 rounded-3xl bg-gradient-to-r from-emerald-700 to-teal-600 p-7 text-white">
        <p className="text-sm opacity-70">Your username / referral code</p>
        <div className="mt-2 flex max-w-2xl items-center gap-2 break-all rounded-xl bg-white/15 p-3 text-sm font-bold">
          {code}
          <button onClick={copy} className="ml-auto shrink-0 rounded-lg bg-white/20 p-2" title="Copy invitation message" aria-label="Copy invitation message">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-3 w-full break-all text-xs leading-5 text-white/80">{link}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={() => share(`https://wa.me/?text=${encodeURIComponent(shareText)}`)} className="rounded-xl bg-[#25D366] px-4 py-3 font-bold">
            <MessageCircle className="mr-2 inline h-4 w-4" />WhatsApp
          </button>
          <button onClick={() => share(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`)} className="rounded-xl bg-[#1877F2] px-4 py-3 font-bold">
            <Facebook className="mr-2 inline h-4 w-4" />Facebook
          </button>
          <button onClick={() => share(`https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join Me Cash and earn money by completing simple tasks!')}`)} className="rounded-xl bg-black px-4 py-3 font-bold">
            <Twitter className="mr-2 inline h-4 w-4" />Twitter
          </button>
          <button onClick={copy} className="rounded-xl bg-white px-4 py-3 font-bold text-emerald-700">
            <Share2 className="mr-2 inline h-4 w-4" />{copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        {copied && <p role="status" className="mt-3 text-sm font-semibold text-white">Invitation message and link copied.</p>}
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[[stats.total, 'Total referrals'], [stats.active, 'Rewards active'], [stats.completed, 'Completed']].map((item) => (
          <div className="rounded-2xl bg-white p-5 shadow-sm" key={item[1]}>
            <b className="text-3xl text-emerald-600">{item[0]}</b>
            <p className="text-sm text-slate-500">{item[1]}</p>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
