'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Bell, ClipboardList, KeyRound, LayoutDashboard, ListChecks, LogOut, Menu, Settings, Users, WalletCards, X } from 'lucide-react';
import { useState } from 'react';

const nav = [
  ['/admin', 'Dashboard', LayoutDashboard],
  ['/admin/users', 'Users', Users],
  ['/admin/tasks', 'Tasks', ListChecks],
  ['/admin/task-accounts', 'Task Accounts', KeyRound],
  ['/admin/task-requests', 'Task Requests', ClipboardList],
  ['/admin/submissions', 'Submissions', ClipboardList],
  ['/admin/withdrawals', 'Withdrawals', WalletCards],
  ['/admin/notifications', 'Notifications', Bell],
  ['/admin/settings', 'Settings', Settings],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  function logout() { router.push('/login'); router.refresh(); }

  const items = <nav className="space-y-1">{nav.map(([href, label, Icon]) => <Link onClick={() => setOpen(false)} key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${path === href ? 'bg-red-950 text-white' : 'text-slate-400 hover:bg-red-950 hover:text-white'}`}><Icon className="h-4 w-4" />{label}</Link>)}<button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-400 hover:bg-red-950 hover:text-white"><LogOut className="h-4 w-4" />Logout</button></nav>;

  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <aside className="fixed hidden h-full w-64 border-r border-slate-800 bg-slate-900 p-5 md:block"><Link href="/admin" className="text-2xl font-black">me<span className="text-red-500">cash</span></Link><div className="mt-3 inline-block rounded bg-red-600 px-2 py-1 text-[10px] font-black tracking-widest">ADMIN PANEL</div><div className="mt-8">{items}</div></aside>
    {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-black/60 md:hidden"><aside onClick={(event) => event.stopPropagation()} className="h-full w-72 bg-slate-900 p-5"><div className="flex items-center justify-between"><Link href="/admin" onClick={() => setOpen(false)} className="text-2xl font-black">me<span className="text-red-500">cash</span></Link><button onClick={() => setOpen(false)} aria-label="Close admin menu"><X /></button></div><div className="mt-8">{items}</div></aside></div>}
    <main className="min-h-screen md:ml-64"><header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur-xl"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><button onClick={() => setOpen(true)} className="rounded-lg bg-slate-800 p-2 md:hidden" aria-label="Open admin menu"><Menu className="h-5 w-5" /></button><span className="rounded bg-red-600 px-2 py-1 text-xs font-black">ADMIN PANEL</span><span className="hidden text-sm text-slate-400 sm:inline">muhammaddanyal4545@gmail.com</span></div><div className="flex gap-2"><Link href="/dashboard/profile" className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold"><ArrowLeft className="mr-1 inline h-4 w-4" />Back</Link><button onClick={logout} className="hidden rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold sm:block"><LogOut className="mr-1 inline h-4 w-4" />Logout</button></div></div></header><div className="p-5 md:p-8">{children}</div></main>
  </div>;
}
