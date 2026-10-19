'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, LoaderCircle } from 'lucide-react';
import DashboardShell from '../../../components/dashboard/DashboardShell';

type NotificationItem = { id: string; title: string; message: string; is_read: boolean; created_at?: string };
type Toast = { message: string; kind: 'success' | 'error' };

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(message: string, kind: Toast['kind']) {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 3200);
  }

  useEffect(() => {
    let active = true;
    fetch('/api/notifications', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load notifications.');
        if (active) setItems(result.data || []);
      })
      .catch((error: unknown) => {
        if (active) showToast(error instanceof Error ? error.message : 'Could not load notifications.', 'error');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function clearAll() {
    if (clearing || !items.some((item) => !item.is_read)) return;
    setClearing(true);
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not clear notifications.');
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
      router.refresh();
      showToast('All notifications marked as read.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not clear notifications.', 'error');
    } finally {
      setClearing(false);
    }
  }

  const hasUnread = items.some((item) => !item.is_read);

  return <DashboardShell>
    {toast && <div role="status" className={`fixed right-4 top-20 z-[80] max-w-sm rounded-xl px-4 py-3 text-sm font-bold text-white shadow-xl ${toast.kind === 'success' ? 'bg-emerald-700' : 'bg-red-700'}`}>{toast.message}</div>}
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-4xl font-black">Notifications</h1><p className="mt-2 text-slate-500">Task, referral and withdrawal updates.</p></div>
      <button type="button" onClick={() => void clearAll()} disabled={!hasUnread || clearing} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-45">{clearing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}{clearing ? 'Clearing…' : 'Clear All'}</button>
    </div>
    <div className="mt-8 space-y-3">
      {items.map((item) => <div key={item.id} className={`flex gap-3 rounded-2xl p-5 shadow-sm ${item.is_read ? 'bg-white' : 'border border-emerald-100 bg-emerald-50/70'}`}><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.is_read ? 'bg-slate-200' : 'bg-emerald-500'}`} /><div><b>{item.title}</b><p className="mt-1 text-sm text-slate-500">{item.message}</p></div></div>)}
      {!loading && !items.length && <div className="rounded-2xl bg-white p-8 text-center text-slate-500">No notifications yet.</div>}
      {loading && <div className="space-y-3"><div className="h-20 animate-pulse rounded-2xl bg-white" /><div className="h-20 animate-pulse rounded-2xl bg-white" /></div>}
    </div>
  </DashboardShell>;
}
