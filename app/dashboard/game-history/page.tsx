'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Gamepad2, XCircle } from 'lucide-react';
import DashboardShell from '../../../components/dashboard/DashboardShell';

type Submission = { id: string; task_id: string; status: string; admin_note?: string | null; created_at: string };
type Task = { id: string; task_name: string };

export default function GameHistoryPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [taskNames, setTaskNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch('/api/me', { cache: 'no-store' }).then((response) => response.json()), fetch('/api/tasks', { cache: 'no-store' }).then((response) => response.json())])
      .then(([account, taskData]) => {
        setSubmissions((account.submissions || []).slice().sort((a: Submission, b: Submission) => +new Date(b.created_at) - +new Date(a.created_at)));
        const map: Record<string, string> = {};
        (taskData.tasks || []).forEach((task: Task) => { map[task.id] = task.task_name; });
        setTaskNames(map);
      })
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell>
      <Link href="/dashboard/profile" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-700"><ArrowLeft className="h-4 w-4" />Profile</Link>
      <div className="mt-4 flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-700 text-white shadow-lg"><Gamepad2 /></span><div><p className="text-xs font-black uppercase tracking-widest text-indigo-700">Player activity</p><h1 className="text-3xl font-black text-slate-900">Game History</h1><p className="mt-1 text-sm text-slate-500">Your task submissions and review status.</p></div></div>
      <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
        {loading ? <p className="text-sm text-slate-400">Loading task history…</p> : submissions.length ? <div className="divide-y divide-slate-100">{submissions.map((item) => <article key={item.id} className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"><div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><Gamepad2 className="h-5 w-5" /></span><div className="min-w-0"><h2 className="truncate font-bold text-slate-900">{taskNames[item.task_id] || `Task ${item.task_id.slice(0, 8)}`}</h2><p className="mt-1 text-xs text-slate-500">Submitted {new Date(item.created_at).toLocaleString()}</p>{item.admin_note && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-600">Admin note: {item.admin_note}</p>}</div></div><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black capitalize ${item.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : item.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{item.status === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5" /> : item.status === 'rejected' ? <XCircle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}{item.status}</span></article>)}</div> : <div className="py-10 text-center"><Gamepad2 className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-700">No task history yet</p><p className="mt-1 text-sm text-slate-500">Your submissions will appear here.</p><Link href="/dashboard/tasks" className="mt-4 inline-block rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Explore tasks</Link></div>}
      </section>
    </DashboardShell>
  );
}
