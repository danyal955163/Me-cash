'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit2, KeyRound, Pause, Play, Trash2, X } from 'lucide-react';
import { TASK_CATEGORIES, TASK_CATEGORY_LABELS, type TaskCategory } from '../../../lib/task-categories';

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
  status: 'active' | 'paused' | 'expired' | 'draft';
  completion_type: 'one_time' | 'repeatable';
  category: TaskCategory;
  is_account_task: boolean;
};

type TaskForm = {
  task_name: string;
  task_description: string;
  task_steps: string;
  task_type: 'open_link' | 'share_message';
  task_url: string;
  share_message: string;
  reward: string;
  status: Task['status'];
  completion_type: Task['completion_type'];
  category: TaskCategory;
  is_account_task: boolean;
};

const emptyForm: TaskForm = {
  task_name: '', task_description: '', task_steps: '', task_type: 'open_link', task_url: '',
  share_message: '', reward: '', status: 'draft', completion_type: 'one_time',
  category: 'simple', is_account_task: false,
};

export default function TasksAdmin() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tasks', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load tasks.');
      setTasks(result.data || []);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not load tasks.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function update<K extends keyof TaskForm>(key: K, value: TaskForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function create() {
    setEditing(null);
    setForm(emptyForm);
    setImages([]);
    setFiles([]);
    setOpen(true);
  }

  function edit(task: Task) {
    setEditing(task.id);
    setForm({
      task_name: task.task_name || '',
      task_description: task.task_description || '',
      task_steps: task.task_steps || '',
      task_type: task.task_type || 'open_link',
      task_url: task.task_url || '',
      share_message: task.share_message || '',
      reward: String(task.reward || ''),
      status: task.status || 'draft',
      completion_type: task.completion_type || 'one_time',
      category: task.category || 'simple',
      is_account_task: Boolean(task.is_account_task),
    });
    setImages(task.proof_images || []);
    setFiles([]);
    setOpen(true);
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      if (!form.task_name.trim() || !form.task_description.trim() || !form.task_steps.trim() || !form.reward) {
        throw new Error('Please fill all required fields.');
      }
      if (form.task_type === 'open_link' && !form.task_url.trim()) throw new Error('Task URL is required.');
      if (form.task_type === 'share_message' && !form.share_message.trim()) throw new Error('Share Message is required.');

      const payload = {
        ...form,
        task_url: form.task_url || null,
        share_message: form.share_message || null,
        reward: Number(form.reward),
        proof_images: images,
      };
      const url = editing ? `/api/admin/tasks/${editing}` : '/api/admin/tasks';
      const response = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        const details = result.details ? ` | Details: ${typeof result.details === 'string' ? result.details : JSON.stringify(result.details)}` : '';
        throw new Error(`${result.error || 'Could not save task.'}${details}`);
      }

      const id = editing || result.data.id;
      if (files.length) {
        const formData = new FormData();
        files.slice(0, 10 - images.length).forEach((file) => formData.append('files', file));
        const uploadResponse = await fetch(`/api/admin/tasks/${id}/upload-examples`, { method: 'POST', body: formData });
        if (!uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          throw new Error(`Could not upload example images: ${uploadResult.error || 'Please try again.'}`);
        }
      }

      await load();
      setOpen(false);
      alert(editing ? 'Task updated successfully.' : 'Task created successfully.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not save task.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(task: Task) {
    const status: Task['status'] = task.status === 'active' ? 'paused' : 'active';
    const response = await fetch(`/api/admin/tasks/${task.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }),
    });
    if (response.ok) await load();
    else alert('Could not update task.');
  }

  async function remove(id: string) {
    if (!confirm('Delete this task? This also removes its account inventory and submissions.')) return;
    const response = await fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' });
    if (response.ok) await load();
    else alert('Could not delete task.');
  }

  return <>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-black">Task Management</h1><p className="mt-2 text-sm text-slate-400">Create tasks and choose where they appear in the user task categories.</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/task-accounts" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-bold text-slate-200 hover:border-indigo-500"><KeyRound className="h-4 w-4" />Task Accounts</Link><button type="button" onClick={create} className="rounded-xl bg-red-600 px-5 py-3 font-bold hover:bg-red-500">+ Create Task</button></div></div>

    <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900"><table className="w-full min-w-[1060px] text-left text-sm"><thead className="border-b border-slate-800 text-xs uppercase text-slate-500"><tr>{['Task Name', 'Category', 'Type', 'Completion', 'Reward Coins', 'Status', 'Actions'].map((title) => <th className="px-5 py-4" key={title}>{title}</th>)}</tr></thead><tbody>{tasks.map((task) => <tr className="border-b border-slate-800" key={task.id}><td className="px-5 py-4 font-bold">{task.task_name}{task.is_account_task && <span className="ml-2 rounded-full bg-indigo-950 px-2 py-1 text-[10px] font-bold text-indigo-300">Account task</span>}</td><td className="px-5 py-4">{TASK_CATEGORY_LABELS[task.category] || 'Simple Tasks'}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-800 px-2 py-1 text-xs">{task.task_type === 'open_link' ? 'Open Link' : 'Share Message'}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-bold ${task.completion_type === 'repeatable' ? 'bg-emerald-900 text-emerald-300' : 'bg-blue-900 text-blue-300'}`}>{task.completion_type === 'repeatable' ? 'Repeatable' : 'One-time'}</span></td><td className="px-5 py-4 text-amber-400">{Number(task.reward || 0).toLocaleString()} 🪙</td><td className="px-5 py-4 capitalize">{task.status}</td><td className="px-5 py-4"><div className="flex gap-2"><button type="button" onClick={() => edit(task)} className="rounded-lg bg-slate-700 p-2" title="Edit"><Edit2 className="h-4 w-4" /></button><button type="button" onClick={() => void toggle(task)} className="rounded-lg bg-amber-700 p-2" title="Pause or resume">{task.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button><button type="button" onClick={() => void remove(task.id)} className="rounded-lg bg-red-700 p-2" title="Delete"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table>{!loading && !tasks.length && <p className="p-10 text-center text-slate-500">No tasks yet.</p>}{loading && <p className="p-10 text-center text-slate-500">Loading tasks…</p>}</div>

    {open && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4"><div className="mx-auto my-8 max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">{editing ? 'Edit Task' : 'Create Task'}</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close task form" className="rounded-xl p-2 hover:bg-slate-800"><X /></button></div>
      <div className="mt-6 space-y-4"><label className="block text-sm font-bold">Task Name *<input value={form.task_name} onChange={(event) => update('task_name', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3" /></label><label className="block text-sm font-bold">Description *<textarea value={form.task_description} onChange={(event) => update('task_description', event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-slate-700 bg-slate-800 p-3" /></label><label className="block text-sm font-bold">Instructions *<textarea value={form.task_steps} onChange={(event) => update('task_steps', event.target.value)} className="mt-2 min-h-32 w-full rounded-xl border border-slate-700 bg-slate-800 p-3" /></label>
        <fieldset><legend className="text-sm font-bold">Task Type *</legend><div className="mt-2 flex flex-wrap gap-5"><label className="flex items-center gap-2"><input type="radio" checked={form.task_type === 'open_link'} onChange={() => update('task_type', 'open_link')} />Open Link</label><label className="flex items-center gap-2"><input type="radio" checked={form.task_type === 'share_message'} onChange={() => update('task_type', 'share_message')} />Share Message</label></div></fieldset>
        {form.task_type === 'open_link' ? <label className="block text-sm font-bold">Task URL *<input type="url" value={form.task_url} onChange={(event) => update('task_url', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3" /></label> : <label className="block text-sm font-bold">Share Message *<textarea value={form.share_message} onChange={(event) => update('share_message', event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-800 p-3" /></label>}
        <label className="block text-sm font-bold">Category<select value={form.category} onChange={(event) => update('category', event.target.value as TaskCategory)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3">{TASK_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-900 bg-indigo-950/40 p-4"><input type="checkbox" checked={form.is_account_task} onChange={(event) => update('is_account_task', event.target.checked)} className="mt-1 h-4 w-4 accent-indigo-500" /><span><span className="block text-sm font-bold">This task requires a provided game/account login</span><span className="mt-1 block text-xs text-slate-400">Users must claim their own dedicated email and password before submitting proof.</span></span></label>
        <label className="block text-sm font-bold">Reward Coins *<input type="number" min="1" value={form.reward} onChange={(event) => update('reward', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3" /></label>
        <fieldset><legend className="text-sm font-bold">Completion Type *</legend><div className="mt-2 flex flex-wrap gap-5"><label className="flex items-center gap-2"><input type="radio" checked={form.completion_type === 'one_time'} onChange={() => update('completion_type', 'one_time')} />One-time</label><label className="flex items-center gap-2"><input type="radio" checked={form.completion_type === 'repeatable'} onChange={() => update('completion_type', 'repeatable')} />Repeatable</label></div></fieldset>
        <label className="block text-sm font-bold">Status<select value={form.status} onChange={(event) => update('status', event.target.value as TaskForm['status'])} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3"><option value="active">Active</option><option value="paused">Paused</option><option value="expired">Expired</option><option value="draft">Draft</option></select></label>
        <label className="block text-sm font-bold">Example Screenshot (shown to users)<input type="file" accept="image/*" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 10 - images.length))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3" /><span className="mt-1 block text-xs text-slate-400">{images.length + files.length}/10 images</span></label>
        {images.length > 0 && <div className="flex flex-wrap gap-2">{images.map((image) => <div key={image} className="relative"><img src={image} alt="Task example" className="h-16 w-16 rounded-lg object-cover" /><button type="button" onClick={() => setImages((current) => current.filter((item) => item !== image))} className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1" aria-label="Remove example image"><X className="h-3 w-3" /></button></div>)}</div>}
      </div><button type="button" disabled={busy} onClick={() => void save()} className="mt-6 w-full rounded-xl bg-red-600 py-3 font-bold hover:bg-red-500 disabled:opacity-60">{busy ? 'Saving…' : 'Save Task'}</button></div></div>}
  </>;
}
