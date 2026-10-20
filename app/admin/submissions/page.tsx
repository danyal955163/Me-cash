'use client';

import { useEffect, useState } from 'react';
import { Copy, Search, X } from 'lucide-react';
import MessageUserButton from '../../../components/admin/MessageUserButton';

type Wallet = { coin_balance?: number; red_pocket_balance?: number };
type Profile = {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  referral_code?: string;
  username?: string;
  wallets?: Wallet | Wallet[];
};
type TaskInfo = { id?: string; task_name?: string; task_description?: string; reward?: number; is_account_task?: boolean };
type Row = {
  id: string;
  user_id: string;
  task_id: string;
  status: string;
  proof_text: string | null;
  proof_url: string | null;
  proof_images?: string[];
  admin_note: string | null;
  created_at: string;
  profiles?: Profile | null;
  tasks?: TaskInfo | TaskInfo[] | null;
  task_account?: { email: string; password: string; status: string; assigned_username?: string | null } | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function Submissions() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState<{ images: string[]; index: number } | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [notice, setNotice] = useState('');
  const [pageError, setPageError] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/submissions?status=${filter}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(`${result.error || 'Could not load submissions.'}${result.details ? ` | ${result.details}` : ''}`);
      setRows(result.data || []);
      setPageError('');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not load submissions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [filter]);

  useEffect(() => {
    if (!selected || !one(selected.tasks)?.is_account_task) {
      setAccountLoading(false);
      setAccountError('');
      return;
    }
    const submissionId = selected.id;
    let live = true;
    setAccountLoading(true);
    setAccountError('');
    fetch(`/api/admin/submissions/${submissionId}/account`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load assigned credentials.');
        if (live) setSelected((current) => current?.id === submissionId ? { ...current, task_account: result.account || null } : current);
      })
      .catch((error: unknown) => { if (live) setAccountError(error instanceof Error ? error.message : 'Could not load assigned credentials.'); })
      .finally(() => { if (live) setAccountLoading(false); });
    return () => { live = false; };
  }, [selected?.id]);

  async function copyCredential(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); }
    catch {
      const element = document.createElement('textarea');
      element.value = value;
      document.body.appendChild(element);
      element.select();
      document.execCommand('copy');
      element.remove();
    }
    setNotice(`${label} copied.`);
    window.setTimeout(() => setNotice(''), 2500);
  }

  async function act(id: string, action: 'approve' | 'reject') {
    let body = {};
    if (action === 'reject') {
      const note = prompt('Admin note (minimum 5 characters)');
      if (!note || note.trim().length < 5) return;
      body = { admin_note: note.trim() };
    }
    const response = await fetch(`/api/admin/submissions/${id}/${action}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    if (response.ok) {
      setSelected(null);
      await load();
      if (action === 'approve') {
        setNotice("Task approved! Coins credited to user's wallet.");
        window.setTimeout(() => setNotice(''), 3500);
      }
    } else {
      const result = await response.json().catch(() => ({}));
      alert(result.error || 'Action failed. Please try again.');
    }
  }

  const images = (row: Row) => (row.proof_images || (row.proof_url ? [row.proof_url] : [])).slice(0, 10);
  const filtered = rows.filter((row) => {
    const query = search.toLowerCase();
    const task = one(row.tasks);
    const profile = row.profiles;
    return !query || [profile?.full_name, profile?.username, profile?.referral_code, profile?.email, task?.task_name]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });
  const selectedTask = one(selected?.tasks);
  const selectedWallet = one(selected?.profiles?.wallets);

  return <>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-red-400">Review queue</p><h1 className="mt-2 text-3xl font-black">Task Requests</h1></div><button type="button" onClick={() => void load()} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold">Refresh</button></div>
    <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3"><Search className="h-4 w-4 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username, email or task title..." className="w-full bg-transparent p-3 text-sm outline-none" /></div>
    {notice && <div role="status" className="mt-4 rounded-xl bg-emerald-900/70 px-4 py-3 text-sm font-bold text-emerald-200">{notice}</div>}
    {pageError && <div role="alert" className="mt-4 rounded-xl bg-red-950 px-4 py-3 text-sm font-bold text-red-200">{pageError}</div>}
    <div className="mt-5 flex flex-wrap gap-2">{['all', 'pending', 'approved', 'rejected'].map((status) => <button type="button" onClick={() => setFilter(status)} className={`rounded-xl px-4 py-2 text-sm font-bold capitalize ${filter === status ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`} key={status}>{status}</button>)}</div>

    <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900"><table className="w-full min-w-[950px] text-left text-sm"><thead className="border-b border-slate-800 text-xs uppercase text-slate-500"><tr>{['User', 'Task', 'Submitted', 'Proof', 'Reward', 'Status', 'Actions'].map((title) => <th className="px-5 py-4" key={title}>{title}</th>)}</tr></thead><tbody>{filtered.map((row) => { const task = one(row.tasks); const proofImages = images(row); return <tr className="border-b border-slate-800" key={row.id}><td className="px-5 py-4"><b>{row.profiles?.referral_code || row.profiles?.full_name || 'User'}</b><br /><span className="text-xs text-slate-500">{row.profiles?.email}</span></td><td className="px-5 py-4">{task?.task_name || 'Task'}{task?.is_account_task && <span className="ml-2 rounded-full bg-indigo-950 px-2 py-1 text-[10px] font-bold text-indigo-300">Account</span>}</td><td className="px-5 py-4 text-slate-400">{new Date(row.created_at).toLocaleString()}</td><td className="px-5 py-4"><div className="flex gap-1">{proofImages.slice(0, 4).map((url, index) => <button type="button" onClick={() => setPreview({ images: proofImages, index })} key={`${url}-${index}`}><img src={url} alt={`Proof ${index + 1}`} className="h-12 w-12 rounded-lg object-cover" /></button>)}</div></td><td className="px-5 py-4 text-amber-400">{Number(task?.reward || 0).toLocaleString()} 🪙</td><td className="px-5 py-4 capitalize">{row.status}</td><td className="px-5 py-4"><div className="flex gap-2"><button type="button" onClick={() => setSelected(row)} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold">View</button><MessageUserButton userId={row.profiles?.id} />{row.status === 'pending' && <><button type="button" onClick={() => void act(row.id, 'approve')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold">Approve</button><button type="button" onClick={() => void act(row.id, 'reject')} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold">Reject</button></>}</div></td></tr>; })}</tbody></table>{!loading && !filtered.length && <p className="p-10 text-center text-slate-500">No task requests found.</p>}{loading && <p className="p-10 text-center text-slate-500">Loading submissions…</p>}</div>

    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-slate-900 p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Submission Review</h2><button type="button" onClick={() => setSelected(null)} aria-label="Close review"><X /></button></div>
      <p className="mt-4"><b>Name:</b> {selected.profiles?.full_name || '—'}</p><p className="mt-2"><b>Username:</b> {selected.profiles?.username || selected.profiles?.referral_code || '—'}</p><p className="mt-2"><b>Email:</b> {selected.profiles?.email || '—'}</p><p className="mt-2"><b>Phone:</b> {selected.profiles?.phone || '—'}</p><p className="mt-2"><b>Coins:</b> {Number(selectedWallet?.coin_balance || 0).toLocaleString()}</p><p className="mt-2"><b>RP:</b> {Number(selectedWallet?.red_pocket_balance || 0).toLocaleString()}</p><p className="mt-2"><b>Task:</b> {selectedTask?.task_name || '—'}</p><p className="mt-2"><b>Reward:</b> {Number(selectedTask?.reward || 0).toLocaleString()} coins</p>
      {selectedTask?.is_account_task && <section className="mt-4 rounded-xl border border-indigo-800 bg-indigo-950/50 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-black text-indigo-200">Assigned task credentials</h3>{selected.task_account && <span className="rounded-full bg-indigo-900 px-2 py-1 text-xs font-bold capitalize">{selected.task_account.status}</span>}</div>{accountLoading ? <p className="mt-3 text-sm text-indigo-200">Loading assigned credentials…</p> : accountError ? <p role="alert" className="mt-3 text-sm text-rose-300">{accountError}</p> : selected.task_account ? <><div className="mt-3 rounded-lg bg-slate-900 p-3"><p className="text-xs font-bold uppercase text-slate-500">Game username</p><p className="mt-1 break-all font-mono text-sm">{selected.task_account.assigned_username || '—'}</p></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-slate-900 p-3"><p className="text-xs font-bold uppercase text-slate-500">Email</p><p className="mt-1 break-all font-mono text-sm">{selected.task_account.email}</p><button type="button" onClick={() => void copyCredential(selected.task_account!.email, 'Account email')} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold"><Copy className="h-3.5 w-3.5" />Copy email</button></div><div className="rounded-lg bg-slate-900 p-3"><p className="text-xs font-bold uppercase text-slate-500">Password</p><p className="mt-1 break-all font-mono text-sm">{selected.task_account.password}</p><button type="button" onClick={() => void copyCredential(selected.task_account!.password, 'Account password')} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold"><Copy className="h-3.5 w-3.5" />Copy password</button></div></div></> : <p className="mt-3 text-sm text-amber-200">No account assignment found for this submission.</p>}</section>}
      {selected.proof_text && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{selected.proof_text}</p>}
      {selected.proof_url && safeHttpUrl(selected.proof_url) && <p className="mt-3 break-all text-sm"><b>Proof URL:</b> <a href={safeHttpUrl(selected.proof_url)!} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">{selected.proof_url}</a></p>}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">{images(selected).map((url, index) => <button key={`${url}-${index}`} onClick={() => setPreview({ images: images(selected), index })}><img src={url} alt={`Proof ${index + 1}`} className="h-24 w-full rounded-lg object-cover" /></button>)}</div>
      {selected.status === 'pending' && <div className="mt-6 flex gap-3"><button type="button" onClick={() => void act(selected.id, 'approve')} className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold">Approve</button><button type="button" onClick={() => void act(selected.id, 'reject')} className="flex-1 rounded-xl bg-red-700 py-3 font-bold">Reject</button></div>}
    </div></div>}

    {preview && <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4"><button type="button" onClick={() => setPreview(null)} className="absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white" aria-label="Close proof preview"><X /></button><img src={preview.images[preview.index]} alt="Full proof preview" className="max-h-[75vh] max-w-full rounded-xl object-contain" /><div className="mt-5 flex max-w-full gap-2 overflow-x-auto">{preview.images.map((url, index) => <button type="button" onClick={() => setPreview({ images: preview.images, index })} key={`${url}-${index}`}><img src={url} alt={`Preview ${index + 1}`} className={`h-16 w-16 rounded-lg object-cover ${index === preview.index ? 'ring-2 ring-red-500' : ''}`} /></button>)}</div></div>}
  </>;
}
