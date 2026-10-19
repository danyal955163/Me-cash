'use client';

import Link from 'next/link';
import { Banknote, Bell, CheckCircle2, CheckSquare, Gift, LogOut, Menu, Shield, Settings, User, Users, Wallet, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase-browser';

const baseLinks = [['/dashboard/profile', 'Profile', User], ['/dashboard/wallet', 'Wallet', Wallet], ['/dashboard/referral', 'Referral', Gift], ['/dashboard/tasks', 'Tasks', CheckSquare], ['/dashboard/notifications', 'Notifications', Bell], ['/dashboard/settings', 'Settings', Settings]] as const;
const bottomLinks = [['/dashboard/profile', 'Profile', User], ['/dashboard/wallet', 'Wallet', Wallet], ['/dashboard/referral', 'Referral', Gift], ['/dashboard/tasks', 'Tasks', CheckSquare]] as const;

type Notification = { id: string; title: string; message: string; type?: string; is_read?: boolean };

function NotificationIcon({ type }: { type?: string }) {
  if (type?.includes('withdrawal')) return <Banknote className="h-4 w-4 text-amber-600" />;
  if (type?.includes('referral')) return <Users className="h-4 w-4 text-fuchsia-600" />;
  return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<'EN' | 'UR'>('EN');
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);

  async function loadNotifications() {
    const [n, c] = await Promise.all([
      fetch('/api/notifications', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/notifications/unread', { cache: 'no-store' }).then((r) => r.json()),
    ]);
    setNotifications(n.data || []);
    setUnread(Number(c.count || 0));
  }

  useEffect(() => {
    let active = true;
    fetch('/api/me').then((r) => r.json()).then((x) => {
      if (active) {
        setIsAdmin(x.user?.email?.toLowerCase() === 'muhammaddanyal4545@gmail.com' || x.profile?.role === 'admin');
        setEmail(x.user?.email || '');
      }
    });
    void loadNotifications();
    const timer = setInterval(() => void loadNotifications(), 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const links = isAdmin ? [...baseLinks, ['/admin', 'Admin Panel', Shield] as const] : baseLinks;

  async function toggleBell() {
    const next = !bellOpen;
    setBellOpen(next);
    if (next) {
      await loadNotifications();
      if (unread) {
        await fetch('/api/notifications/read-all', { method: 'POST' });
        setUnread(0);
        setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
      }
    }
  }

  async function markNotificationRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    setNotifications((items) => items.filter((item) => item.id !== id));
    setUnread((count) => Math.max(0, count - 1));
  }

  async function clearNotifications() {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
    setUnread(0);
  }

  async function logout() { await createClient().auth.signOut(); router.push('/login'); router.refresh(); }

  return <div dir={lang === 'UR' ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f5fbf8] text-[#071b18]">
    <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4"><Link href="/" className="text-xl font-black">me<span className="text-emerald-500">cash</span></Link><div className="flex items-center gap-3"><span className="hidden max-w-[180px] truncate text-xs text-slate-400 sm:block">{email}</span><div className="relative"><button onClick={toggleBell} aria-label="Notifications" className="relative rounded-xl bg-emerald-50 p-2 text-emerald-700"><Bell className="h-5 w-5" />{unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-black leading-4 text-white">{unread > 9 ? '9+' : unread}</span>}</button>{bellOpen && <div className="fixed left-2 right-2 top-16 z-50 max-h-[70vh] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-3 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-96 sm:max-w-none"><div className="flex items-center justify-between border-b border-teal-100 pb-2"><b className="text-slate-900">Notifications</b><div className="flex items-center gap-2"><button type="button" onClick={clearNotifications} className="text-xs font-bold text-emerald-700 hover:text-emerald-900">Clear All</button><button type="button" onClick={() => setBellOpen(false)} aria-label="Close notifications" className="rounded-lg p-1 text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button></div></div><div className="max-h-72 overflow-y-auto">{notifications.slice(0, 8).map((n) => <div key={n.id} className="flex items-start gap-2 border-b border-teal-100/70 py-3 text-sm"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white shadow-sm"><NotificationIcon type={n.type} /></span><div className="min-w-0 flex-1"><b className="block text-slate-900">{n.title}</b><p className="mt-1 text-xs text-slate-600">{n.message}</p></div><button type="button" onClick={() => void markNotificationRead(n.id)} aria-label="Mark notification as read" className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"><X className="h-4 w-4" /></button></div>)}{!notifications.length && <p className="py-6 text-center text-xs text-slate-500">No notifications</p>}</div><Link href="/dashboard/notifications" onClick={() => setBellOpen(false)} className="mt-2 block text-center text-xs font-bold text-emerald-700">View all notifications</Link></div>}</div><button onClick={() => setLang(lang === 'EN' ? 'UR' : 'EN')} className="hidden rounded-xl border px-3 py-1 text-xs font-bold sm:block">{lang}</button><button onClick={() => setOpen(!open)} className="rounded-xl border p-2 sm:hidden" aria-label="Open menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>{isAdmin && <Link href="/admin" className="hidden rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 sm:block"><Shield className="mr-1 inline h-4 w-4" />Admin Panel</Link>}<button onClick={logout} className="hidden text-sm text-slate-500 sm:block"><LogOut className="mr-1 inline h-4 w-4" />Logout</button></div></div>{open && <nav className="border-t border-emerald-100 bg-white p-3 sm:hidden"><div className="grid grid-cols-2 gap-2">{links.map(([href, label, Icon]) => <Link onClick={() => setOpen(false)} key={href} href={href} className={`rounded-xl p-3 text-sm font-bold ${path === href ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}><Icon className="mr-2 inline h-4 w-4" />{label}</Link>)}<button onClick={logout} className="rounded-xl bg-red-50 p-3 text-left text-sm font-bold text-red-700"><LogOut className="mr-2 inline h-4 w-4" />Logout</button></div></nav>}</header>
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 md:px-8">{children}</main>
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-emerald-100 bg-white/95 px-2 py-2 shadow-[0_-4px_20px_rgba(0,0,0,.08)] backdrop-blur-xl"><div className="mx-auto grid max-w-xl grid-cols-4">{bottomLinks.map(([href, label, Icon]) => { const active = path === href || path.startsWith(`${href}/`); const color = href.includes('profile') ? 'text-teal-600' : href.includes('wallet') ? 'text-amber-500' : href.includes('referral') ? 'text-fuchsia-600' : 'text-emerald-600'; return <Link key={href} href={href} className="group relative flex flex-col items-center gap-1 py-1 text-[11px] font-bold transition active:scale-95"><span className={`absolute inset-x-3 -top-2 h-1 rounded-full bg-current transition-transform duration-200 ${active ? `${color} scale-100` : 'scale-0'}`} /><Icon className={`h-5 w-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:scale-110 ${active ? `fill-current ${color}` : 'text-slate-400'}`} /><span className={active ? color : 'text-slate-500'}>{label}</span></Link>; })}</div></nav>
  </div>;
}
