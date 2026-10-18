'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BadgeCheck, Check, CirclePlay, Clock3, Copy, Gamepad2, Gift, Link2, LoaderCircle, Mail, Send, Sparkles, X } from 'lucide-react';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import { createClient } from '../../../lib/supabase-browser';

type Task = {
  id: string;
  task_name: string;
  task_description: string;
  task_steps: string;
  task_type: 'open_link' | 'share_message';
  task_url: string | null;
  share_message: string | null;
  reward: number;
  proof_images?: string[];
  completion_type: 'one_time' | 'repeatable';
};
type Submission = { task_id: string; status: string; created_at?: string };
const gradients = [
  'from-violet-600 via-purple-600 to-fuchsia-600',
  'from-sky-600 via-cyan-600 to-teal-500',
  'from-orange-500 via-rose-500 to-pink-600',
  'from-emerald-600 via-green-600 to-lime-500',
  'from-indigo-600 via-blue-600 to-sky-500',
  'from-amber-500 via-orange-500 to-red-500',
];
const icons = [Gamepad2, CirclePlay, Link2, Send, Sparkles, Gift];
const channelUrl = 'https://whatsapp.com/channel/0029Vb8bv8X2f3EImrfUxd3m';
const supportUrl = 'mailto:metask390@gmail.com?subject=Support%20Request&body=Hello%2C%20I%20need%20help%20with%3A';

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [active, setActive] = useState<Task | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userId, setUserId] = useState('');
  const [channelOpened, setChannelOpened] = useState(false);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [toast, setToast] = useState('');
  const [pageError, setPageError] = useState('');

  const load = useCallback(async () => {
    try {
      const [taskResponse, meResponse] = await Promise.all([
        fetch('/api/tasks', { cache: 'no-store' }),
        fetch('/api/me', { cache: 'no-store' }),
      ]);
      const [taskData, meData] = await Promise.all([taskResponse.json(), meResponse.json()]);
      if (!taskResponse.ok) throw new Error(taskData.error || 'Could not load tasks.');
      setTasks(taskData.tasks || []);
      setSubs(taskData.submissions || []);
      const id = meData.profile?.id || meData.user?.id || '';
      setUserId(id);
      setPageError('');
      if (id) {
        const response = await fetch('/api/claim-whatsapp-bonus', { cache: 'no-store' });
        const status = await response.json();
        if (response.ok) setBonusClaimed(Boolean(status.claimed));
      }
    } catch (error: any) {
      setPageError(error.message || 'Could not load tasks. Please refresh.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const storageKey = `wa_opened_${userId}`;
    const syncOpened = () => setChannelOpened(localStorage.getItem(storageKey) === '1');
    syncOpened();
    window.addEventListener('focus', syncOpened);
    document.addEventListener('visibilitychange', syncOpened);
    return () => {
      window.removeEventListener('focus', syncOpened);
      document.removeEventListener('visibilitychange', syncOpened);
    };
  }, [userId]);

  const latestSubmission = useMemo(() => {
    const sorted = [...subs].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    const result = new Map<string, Submission>();
    sorted.forEach((submission) => { if (!result.has(submission.task_id)) result.set(submission.task_id, submission); });
    return result;
  }, [subs]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }

  function close() { setActive(null); setFiles([]); setCopied(false); }

  async function copy() {
    if (!active?.share_message) return;
    try { await navigator.clipboard.writeText(active.share_message); }
    catch {
      const element = document.createElement('textarea');
      element.value = active.share_message;
      document.body.appendChild(element);
      element.select();
      document.execCommand('copy');
      element.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function submitProof() {
    if (!active || !files.length) return;
    setBusy(true);
    try {
      const client = createClient();
      const user = (await client.auth.getUser()).data.user;
      if (!user) throw new Error('Please sign in again.');
      const urls: string[] = [];
      for (const file of files.slice(0, 10)) {
        const path = `${user.id}/${active.id}/${crypto.randomUUID()}-${file.name}`;
        const uploaded = await client.storage.from('proofs').upload(path, file, { contentType: file.type, upsert: false });
        if (uploaded.error) throw uploaded.error;
        urls.push(client.storage.from('proofs').getPublicUrl(path).data.publicUrl);
      }
      const response = await fetch(`/api/tasks/${active.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ proof_images: urls }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to submit proof.');
      setSubs((current) => [...current, { task_id: active.id, status: 'pending', created_at: new Date().toISOString() }]);
      close();
      notify('Proof submitted. Admin will review it soon.');
    } catch (error: any) {
      notify(error.message || 'Failed to submit. Please try again.');
    } finally { setBusy(false); }
  }

  async function claimWhatsAppBonus() {
    if (bonusClaimed || claiming) return;
    if (!channelOpened) { notify('Please open the channel first.'); return; }
    setClaiming(true);
    try {
      const response = await fetch('/api/claim-whatsapp-bonus', { method: 'POST' });
      const result = await response.json();
      if (response.status === 409 || result.alreadyClaimed) {
        setBonusClaimed(true);
        notify('Already claimed.');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not claim your reward.');
      setBonusClaimed(true);
      notify('🎉 1000 Coins added to your wallet!');
      void load();
    } catch (error: any) {
      notify(error.message || 'Could not claim your reward. Please try again.');
    } finally { setClaiming(false); }
  }

  function markChannelOpened() {
    if (!userId) return;
    try { localStorage.setItem(`wa_opened_${userId}`, '1'); } catch { /* Continue opening the channel if storage is unavailable. */ }
  }

  return (
    <DashboardShell>
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#102344] via-[#1b3f74] to-[#087c71] p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-60 w-60 rounded-full border-[34px] border-white/10" />
        <div className="relative flex items-end justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Me Cash · Earn</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Pick a task. Earn Coins.</h1><p className="mt-2 max-w-xl text-sm text-white/75">Complete a task, send proof, and track your rewards from your wallet.</p></div>
          <span className="hidden rounded-2xl border border-white/15 bg-white/10 p-3 sm:grid"><Sparkles className="h-7 w-7 text-amber-200" /></span>
        </div>
      </div>

      {pageError && <p role="alert" className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{pageError}</p>}
      <div className="mt-7 flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-700">Earn now</p><h2 className="mt-1 text-2xl font-black text-slate-900">Available Tasks</h2></div><button type="button" onClick={() => void load()} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:border-emerald-300">Refresh</button></div>

      {tasks.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        {tasks.map((task, index) => {
          const submission = latestSubmission.get(task.id);
          const canOpen = task.completion_type === 'repeatable' ? submission?.status !== 'pending' : !submission;
          const Icon = icons[index % icons.length];
          const action = task.task_type === 'share_message' ? 'Complete' : /watch|video|youtube/i.test(task.task_name) ? 'Watch' : /play|game/i.test(task.task_name) ? 'Play now' : 'Open Link';
          return <button type="button" key={task.id} onClick={() => canOpen && setActive(task)} disabled={!canOpen} className={`group relative flex min-h-52 flex-col overflow-hidden rounded-3xl bg-gradient-to-br ${gradients[index % gradients.length]} p-4 text-left text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-default disabled:opacity-75 sm:min-h-60 sm:p-5`}>
            <span className="pointer-events-none absolute -right-7 -top-9 h-32 w-32 rounded-full border-[18px] border-white/10 transition group-hover:scale-110" />
            <span className="relative flex w-full items-start justify-between gap-2"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-white/15 shadow-sm"><Icon className="h-5 w-5" /></span><span className="rounded-full bg-black/20 px-2.5 py-1.5 text-[10px] font-black sm:text-xs">🪙 {Number(task.reward || 0).toLocaleString()}</span></span>
            <span className="relative mt-5 block line-clamp-2 text-base font-black leading-tight sm:text-lg">{task.task_name}</span>
            <span className="relative mt-2 block min-h-5 w-full truncate text-xs text-white/80 sm:text-sm">{task.task_description}</span>
            <span className="relative mt-auto flex w-full items-center justify-between gap-2 pt-5"><span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-900 shadow-sm sm:text-sm">{action}<ArrowUpRight className="h-3.5 w-3.5" /></span>{submission && <span className="rounded-full bg-black/20 px-2 py-1 text-[10px] font-bold capitalize">{submission.status}</span>}</span>
          </button>;
        })}
      </div> : <div className="mt-4 rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm"><Gamepad2 className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-700">No active tasks right now</p><p className="mt-1 text-sm text-slate-500">Check back soon for new ways to earn.</p></div>}

      <section className="mt-8">
        <div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Follow & more</p><h2 className="mt-1 text-2xl font-black text-slate-900">Extra ways to earn</h2></div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <article className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-[#e8fff4] via-white to-[#d7f8e8] p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#25a568] text-white shadow-md"><Send className="h-6 w-6" /></span><span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800">🪙 1,000 · one-time</span></div>
            <h3 className="mt-4 text-xl font-black text-slate-900">Join our WhatsApp Channel</h3><p className="mt-1 text-sm text-slate-600">Get updates from Me Cash and claim your one-time channel bonus.</p>
            {bonusClaimed ? <span className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-800"><BadgeCheck className="h-4 w-4" />1000 coins claimed</span> : <><a href={channelUrl} target="_blank" rel="noopener noreferrer" onClick={markChannelOpened} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#168451] px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-[#106d42]">Open WhatsApp Channel<ArrowUpRight className="h-4 w-4" /></a><div className="mt-3"><button type="button" onClick={claimWhatsAppBonus} disabled={claiming || bonusClaimed} className={`w-full rounded-xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed bg-amber-400 text-amber-950 hover:bg-amber-300`}>{claiming ? <><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Claiming…</> : 'Claim 1000 Coins'}</button><p className="mt-2 text-center text-xs text-slate-500">The claim button unlocks after you return to this page.</p></div></>}
          </article>

          <a href={supportUrl} className="group flex min-h-60 flex-col justify-between rounded-3xl border border-sky-100 bg-gradient-to-br from-[#e8f5ff] via-white to-[#dbeafe] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6">
            <div className="flex items-start justify-between gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-md"><Mail className="h-6 w-6" /></span><ArrowUpRight className="h-5 w-5 text-sky-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
            <div><h3 className="mt-5 text-xl font-black text-slate-900">Help &amp; Support</h3><p className="mt-1 text-sm text-slate-600">Have an issue? Email us</p><p className="mt-4 inline-flex items-center gap-2 text-sm font-black text-sky-800">metask390@gmail.com<Mail className="h-4 w-4" /></p></div>
          </a>
        </div>
      </section>

      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}

      {active && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="task-detail-title"><div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Task details</p><h2 id="task-detail-title" className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">{active.task_name}</h2></div><button type="button" onClick={close} aria-label="Close task details" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X className="h-5 w-5" /></button></div>
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4"><p className="text-sm font-semibold text-slate-700">{active.task_description}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{active.task_steps}</p><p className="mt-3 font-black text-amber-700">🪙 {Number(active.reward || 0).toLocaleString()} Coins reward</p></div>
        {active.task_type === 'open_link' ? <a href={active.task_url || '#'} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-bold text-white">Open Task Link<ArrowUpRight className="h-4 w-4" /></a> : <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="whitespace-pre-wrap text-sm text-slate-700">{active.share_message}</p><button type="button" onClick={copy} className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">{copied ? <Check className="mr-1 inline h-4 w-4" /> : <Copy className="mr-1 inline h-4 w-4" />}{copied ? 'Copied' : 'Copy message'}</button><p className="mt-2 text-xs text-slate-500">Copy this message and follow the instructions above.</p></div>}
        {(active.proof_images || []).length > 0 && <div className="mt-4"><p className="mb-2 text-sm font-bold text-slate-700">Example proof</p><div className="flex gap-3 overflow-x-auto">{(active.proof_images || []).map((url) => <img key={url} src={url} alt="Task example proof" className="h-32 w-32 shrink-0 rounded-xl object-cover" />)}</div></div>}
        <label className="mt-4 block text-sm font-bold text-slate-700">Upload proof screenshots (up to 10)<input type="file" accept="image/*" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 10))} className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm" /><span className="mt-1 block text-xs font-normal text-slate-500">{files.length}/10 selected</span></label>
        <div className="mt-4 flex gap-3"><button type="button" onClick={close} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600">Cancel</button><button type="button" disabled={busy || !files.length} onClick={submitProof} className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:bg-slate-300">{busy ? 'Uploading…' : 'Submit Proof'}</button></div>
      </div></div>}
    </DashboardShell>
  );
}
