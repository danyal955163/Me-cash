'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, LoaderCircle, Upload } from 'lucide-react';
import { TASK_CATEGORY_LABELS, type TaskCategory } from '../../../lib/task-categories';

type AccountTask = { id: string; task_name: string; category: TaskCategory; status: string };
type AccountRow = {
  id: string;
  email: string;
  status: 'available' | 'assigned' | 'completed';
  assigned_to: string | null;
  assigned_at: string | null;
  profiles?: { id: string; full_name: string; email: string; username?: string; referral_code?: string } | null;
};
type Toast = { message: string; error?: boolean };

export default function TaskAccountsAdmin() {
  const [tasks, setTasks] = useState<AccountTask[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [taskId, setTaskId] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((message: string, error = false) => {
    setToast({ message, error });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async (selectedTaskId: string) => {
    const query = selectedTaskId ? `?task_id=${encodeURIComponent(selectedTaskId)}` : '';
    const response = await fetch(`/api/admin/task-accounts${query}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load task accounts.');
    setTasks(result.tasks || []);
    setAccounts(result.accounts || []);
  }, []);

  useEffect(() => {
    let live = true;
    fetch('/api/admin/task-accounts', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load account tasks.');
        if (live) setTasks(result.tasks || []);
      })
      .catch((error: unknown) => { if (live) notify(error instanceof Error ? error.message : 'Could not load account tasks.', true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [notify]);

  useEffect(() => {
    if (!taskId) { setAccounts([]); return; }
    let live = true;
    load(taskId).catch((error: unknown) => { if (live) notify(error instanceof Error ? error.message : 'Could not load accounts.', true); });
    return () => { live = false; };
  }, [load, notify, taskId]);

  async function uploadAccounts() {
    if (!taskId || !text.trim() || uploading) return;
    setUploading(true);
    try {
      const response = await fetch('/api/admin/task-accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, accounts_text: text }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not upload accounts.');
      setText('');
      await load(taskId);
      notify(`${result.uploaded} account${result.uploaded === 1 ? '' : 's'} uploaded.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not upload accounts.', true);
    } finally {
      setUploading(false);
    }
  }

  const selectedTask = tasks.find((task) => task.id === taskId);
  const assignedName = (account: AccountRow) => account.profiles?.username || account.profiles?.referral_code || account.profiles?.full_name || '—';

  return <>
    {toast && <div role="status" className={`fixed right-4 top-4 z-[80] max-w-sm rounded-xl px-4 py-3 text-sm font-bold text-white shadow-xl ${toast.error ? 'bg-red-700' : 'bg-emerald-700'}`}>{toast.message}</div>}
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-red-400">Credentials</p><h1 className="mt-2 text-3xl font-black">Task Accounts</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Upload one unique email:password pair per line. Credentials are only shown to the assigned user and authorized admins.</p></div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-950 text-red-300"><KeyRound className="h-6 w-6" /></span></div>

    <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
      <label className="block text-sm font-bold">Account task<select value={taskId} onChange={(event) => setTaskId(event.target.value)} disabled={loading} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white"><option value="">Select an account task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.task_name} · {TASK_CATEGORY_LABELS[task.category] || task.category} · {task.status}</option>)}</select></label>
      {selectedTask && <p className="mt-2 text-xs text-slate-400">Selected task: <span className="font-bold text-slate-200">{selectedTask.task_name}</span></p>}
      <label className="mt-5 block text-sm font-bold">Accounts <span className="font-normal text-slate-400">(email@gmail.com:password123, one per line)</span><textarea value={text} onChange={(event) => setText(event.target.value)} rows={8} placeholder={'player1@gmail.com:password123\nplayer2@gmail.com:anotherPassword'} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 font-mono text-sm text-white placeholder:text-slate-500" /></label>
      <button type="button" onClick={() => void uploadAccounts()} disabled={!taskId || !text.trim() || uploading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{uploading ? 'Uploading…' : 'Upload Accounts'}</button>
    </section>

    <section className="mt-7"><div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-black">Uploaded accounts</h2><p className="mt-1 text-sm text-slate-400">Passwords are hidden in this inventory view.</p></div><span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-bold">{accounts.length}</span></div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-slate-800 text-xs uppercase text-slate-500"><tr>{['Email','Status','Assigned user','Assigned at'].map((title) => <th key={title} className="px-5 py-4">{title}</th>)}</tr></thead><tbody>{accounts.map((account) => <tr key={account.id} className="border-b border-slate-800"><td className="px-5 py-4 font-medium">{account.email}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${account.status === 'available' ? 'bg-emerald-950 text-emerald-300' : account.status === 'completed' ? 'bg-blue-950 text-blue-300' : 'bg-amber-950 text-amber-300'}`}>{account.status}</span></td><td className="px-5 py-4">{account.assigned_to ? <><b>{assignedName(account)}</b><span className="block text-xs text-slate-500">{account.profiles?.email}</span></> : '—'}</td><td className="px-5 py-4 text-slate-400">{account.assigned_at ? new Date(account.assigned_at).toLocaleString() : '—'}</td></tr>)}</tbody></table>{taskId && !accounts.length && <p className="p-8 text-center text-slate-500">No accounts uploaded for this task yet.</p>}{!taskId && <p className="p-8 text-center text-slate-500">Select a task to view its accounts.</p>}</div>
    </section>
  </>;
}
