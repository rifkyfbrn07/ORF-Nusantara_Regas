'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Bell, LogOut, User, Settings, CheckCheck, Clock, ChevronDown } from 'lucide-react';
import { SessionUser } from '@/lib/auth/session';
import { getRoleInfo } from '@/lib/auth/roles';
import { logoutAction } from '@/server/actions/authActions';
import { markAllNotificationsReadAction, markNotificationReadAction } from '@/server/actions/notificationActions';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { GlobalSearch } from '@/components/layout/GlobalSearch';

interface TopHeaderProps {
  user: SessionUser;
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    link?: string | null;
    isRead: boolean;
    createdAt: Date | string;
  }>;
  unreadCount?: number;
  onOpenMobileMenu?: () => void;
}

export function TopHeader({ user, notifications = [], unreadCount = 0, onOpenMobileMenu }: TopHeaderProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const roleInfo = getRoleInfo(user.role);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(`${now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifMenu(false);
      if (userRef.current && !userRef.current.contains(event.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-3 shadow-2xs sm:px-5 lg:px-6">
      <div className="flex min-w-0 max-w-xs flex-1 items-center gap-2.5 sm:max-w-sm lg:max-w-md">
        <button onClick={onOpenMobileMenu} className="cursor-pointer rounded-lg p-1.5 text-[#0F315A] transition hover:bg-slate-100 md:hidden" aria-label="Buka Menu Navigasi"><Menu className="h-5 w-5" /></button>
        <GlobalSearch />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 xl:flex">
          <span className="h-1.5 w-1.5 animate-pulse-subtle rounded-full bg-emerald-500" />
          <span className="text-[11px] font-bold text-emerald-800">ORF Muara Karang</span><span className="text-emerald-300">·</span><span className="text-[11px] font-medium text-emerald-700">Operational</span>
        </div>

        <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-bold text-[#0F315A] sm:flex"><Clock className="h-3.5 w-3.5 text-[#0066B3]" /><span>{currentTime || '—'}</span></div>

        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotifMenu((value) => !value)} aria-label="Buka Notifikasi" className="relative cursor-pointer rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#0F315A]">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && <span className="anim-pop absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#E1251B] px-1 text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {showNotifMenu && (
            <div className="anim-dropdown absolute right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg sm:w-80 md:w-96">
              <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2"><div className="flex items-center gap-2"><span className="text-xs font-bold text-[#0F315A]">Notifikasi</span>{unreadCount > 0 && <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">{unreadCount} baru</span>}</div>{unreadCount > 0 && <button onClick={() => markAllNotificationsReadAction()} className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-[#0066B3] hover:underline"><CheckCheck className="h-3 w-3" />Tandai dibaca</button>}</div>
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                {notifications.length === 0 ? <div className="p-6 text-center text-xs text-slate-400">Belum ada notifikasi baru</div> : notifications.slice(0, 5).map((notification) => <Link key={notification.id} href={notification.link || '/notifications'} onClick={() => { void markNotificationReadAction(notification.id); setShowNotifMenu(false); }} className={`block p-3 text-left transition hover:bg-slate-50 ${!notification.isRead ? 'bg-blue-50/30' : ''}`}><div className="flex items-start justify-between gap-2"><p className={`text-xs ${!notification.isRead ? 'font-bold text-[#0F315A]' : 'font-medium text-slate-700'}`}>{notification.title}</p>{!notification.isRead && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E1251B]" />}</div><p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{notification.message}</p></Link>)}
              </div>
              <div className="border-t border-slate-100 bg-slate-50/60 px-3.5 py-1.5 text-center"><Link href="/notifications" onClick={() => setShowNotifMenu(false)} className="text-xs font-bold text-[#0066B3] hover:underline">Lihat Semua Notifikasi →</Link></div>
            </div>
          )}
        </div>

        <div className="relative" ref={userRef}>
          <button onClick={() => setShowUserMenu((value) => !value)} aria-label="Menu Pengguna" className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent p-1 pl-1 pr-2 transition hover:border-slate-200 hover:bg-slate-100/80">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={32} status="ONLINE" />
            <div className="hidden max-w-[150px] text-left sm:block"><p className="truncate text-xs font-bold leading-tight text-[#0F315A]">{user.name}</p><p className="truncate text-[10px] font-semibold leading-tight text-slate-500">@{user.username} · {roleInfo.shortLabel}</p></div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
          </button>

<<<<<<< HEAD
          {showUserMenu && <div className="anim-dropdown absolute right-0 z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
            <div className="border-b border-slate-100 px-3.5 py-2.5"><div className="mb-0.5 flex items-center justify-between gap-2"><p className="truncate text-xs font-bold text-[#0F315A]">{user.name}</p><span className={`rounded border px-1.5 py-0.2 text-[9px] font-mono font-bold ${roleInfo.badgeClass}`}>{user.role}</span></div><p className="truncate font-mono text-[11px] font-semibold text-[#1769AA]">@{user.username}</p><p className="truncate text-[11px] text-slate-500">{user.email || 'Email belum diisi'}</p><p className="mt-0.5 font-mono text-[10px] font-semibold text-slate-400">NIP: {user.employeeId}</p></div>
            <Link href="/profile" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#0066B3]"><User className="h-3.5 w-3.5 text-slate-400" />Profil Akun</Link>
            <Link href={user.role === 'ADMIN' ? '/admin/settings' : '/profile#keamanan'} onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#0066B3]"><Settings className="h-3.5 w-3.5 text-slate-400" />Pengaturan</Link>
            <button onClick={handleLogout} className="mt-1 flex w-full cursor-pointer items-center gap-2 border-t border-slate-100 px-3.5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"><LogOut className="h-3.5 w-3.5 text-red-500" />Keluar (Logout)</button>
          </div>}
=======
          {showUserMenu && (
            <div className="anim-dropdown absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-bold text-[#0F315A] truncate">{user.name}</p>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${roleInfo.badgeClass}`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">{user.email || 'Belum ada email'}</p>
                <p className="text-[10px] font-mono font-semibold text-slate-400 mt-0.5">
                  NIP: {user.employeeId}
                </p>
              </div>

              <Link
                href="/profile"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0066B3] transition"
              >
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>Profil Akun</span>
              </Link>

              <Link
                href={user.role === 'ADMIN' ? '/admin/settings' : '/profile#keamanan'}
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0066B3] transition"
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                <span>Pengaturan</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 border-t border-slate-100 mt-1 cursor-pointer transition"
              >
                <LogOut className="h-3.5 w-3.5 text-red-500" />
                <span>Keluar (Logout)</span>
              </button>
            </div>
          )}
>>>>>>> f728c28 (coba)
        </div>
      </div>
    </header>
  );
}
