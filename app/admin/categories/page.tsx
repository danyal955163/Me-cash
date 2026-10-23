'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import type { TaskCategory } from '../../../lib/task-categories';

export default function CategoriesAdmin() {
  const router = useRouter();
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/categories', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load categories.');
      setCategories(result.categories || []);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function startEdit(category: TaskCategory) {
    setEditingId(category.id);
    setName(category.name);
    setError('');
    setNotice('');
  }

  function cancelEdit() {
    setEditingId(null);
    setName('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save category.');
      setNotice(editingId ? 'Category updated.' : 'Category added.');
      cancelEdit();
      await load();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save category.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(category: TaskCategory) {
    if (!window.confirm(`Delete “${category.name}”? Tasks assigned to it will become Uncategorized, but the tasks will not be deleted.`)) return;
    setBusyId(category.id);
    setError('');
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not delete category.');
      if (editingId === category.id) cancelEdit();
      setNotice('Category deleted. Existing tasks remain available as Uncategorized.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete category.');
    } finally {
      setBusyId(null);
    }
  }

  return <>
    <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-950 text-red-300"><Tag className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-widest text-red-400">Task system</p><h1 className="mt-1 text-3xl font-black">Categories</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Manage the categories shown as filters on the user Tasks page. Deleting a category never deletes its tasks.</p></div></div>

    {error && <p role="alert" aria-live="assertive" className="fixed bottom-6 left-1/2 z-[80] w-[min(92vw,32rem)] -translate-x-1/2 rounded-xl border border-red-900 bg-red-950 p-4 text-sm font-semibold text-red-200 shadow-2xl">{error}</p>}
    {notice && <p role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-[80] w-[min(92vw,32rem)] -translate-x-1/2 rounded-xl border border-emerald-900 bg-emerald-950 p-4 text-sm font-semibold text-emerald-200 shadow-2xl">{notice}</p>}

    <form onSubmit={save} className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"><label className="block text-sm font-bold">{editingId ? 'Rename category' : 'New category'}<input autoFocus value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} required placeholder="e.g. Watch & Earn" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white placeholder:text-slate-500" /></label><div className="mt-4 flex flex-wrap gap-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black hover:bg-red-500 disabled:opacity-60">{editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Category'}</button>{editingId && <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300"><X className="h-4 w-4" />Cancel</button>}</div></form>

    <section className="mt-7"><div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-black">Current categories</h2><p className="mt-1 text-sm text-slate-400">{categories.length} available to assign to tasks</p></div><button type="button" onClick={() => void load()} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-slate-300">Refresh</button></div><div className="mt-4 space-y-3">{categories.map((category) => <article key={category.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-800 text-amber-300"><Tag className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate font-bold">{category.name}</p><p className="mt-0.5 text-xs text-slate-500">Shown to users as a task filter</p></div></div><div className="flex gap-2"><button type="button" onClick={() => startEdit(category)} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200 hover:border-slate-500"><Pencil className="h-3.5 w-3.5" />Edit</button><button type="button" onClick={() => void remove(category)} disabled={busyId === category.id} className="inline-flex items-center gap-2 rounded-lg border border-red-950 bg-red-950/40 px-3 py-2 text-xs font-bold text-red-300 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{busyId === category.id ? 'Deleting…' : 'Delete'}</button></div></article>)}{!loading && !categories.length && <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">No categories yet. Add one above to make it available to tasks.</p>}{loading && <p className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">Loading categories…</p>}</div></section>
  </>;
}
