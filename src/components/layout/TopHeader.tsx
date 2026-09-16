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
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';

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

export function TopHeader({
  user,
  notifications = [],
  unreadCount = 0,
  onOpenMobileMenu,
}: TopHeaderProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const roleInfo = getRoleInfo(user.role);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        `${now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })} WIB`
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
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
    <header className="sticky top-0 z-30 flex flex-col w-full border-b border-[#E2E8F0] dark:border-[rgba(100,180,230,0.15)] bg-white/95 dark:bg-[#0A2034]/95 backdrop-blur-md shadow-[0_2px_12px_rgba(11,53,104,0.03)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
      {/* 1. Visible Pertamina 3-Color Top Strip */}
      <div className="pertamina-top-strip" />

      {/* 2. Main Top Header Bar */}
      <div className="flex h-15 w-full items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left: Mobile Drawer Trigger & Search Box */}
        <div className="flex min-w-0 max-w-xs flex-1 items-center gap-2.5 sm:max-w-sm lg:max-w-md">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="cursor-pointer rounded-lg p-1.5 text-text-primary transition hover:bg-[#0077C8]/10 dark:hover:bg-white/10 md:hidden"
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="h-5 w-5" />
          </button>
          <GlobalSearch />
        </div>

        {/* Right: Facility Status Badge, Clock, Theme Toggler, Notif, User Menu */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Facility Status Badge (ORF Muara Karang · OCC Ready) */}
          <div className="hidden items-center gap-2 rounded-full border border-[#22A65A]/30 dark:border-[rgba(105,190,40,0.25)] bg-[#22A65A]/10 dark:bg-[rgba(105,190,40,0.12)] px-3 py-1 text-xs font-semibold text-[#22A65A] dark:text-[#69BE28] xl:flex">
            <span className="h-2 w-2 animate-pulse-subtle rounded-full bg-[#22A65A] dark:bg-[#69BE28] shadow-[0_0_8px_#69BE28]" />
            <span className="text-[11.5px] font-extrabold text-[#0B3568] dark:text-[#F5FAFF]">
              ORF Muara Karang
            </span>
            <span className="h-2 w-2 rounded-full bg-[#22A65A] dark:bg-[#69BE28] shadow-[0_0_8px_#69BE28]" />
            <span className="text-[11px] font-black uppercase tracking-wider text-[#22A65A] dark:text-[#69BE28]">
              OCC READY
            </span>
          </div>

          {/* Jakarta Clock & Date Pill */}
          <div className="hidden items-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-[rgba(100,180,230,0.16)] bg-[#F4F9FC] dark:bg-[#081D31] px-3 py-1 font-mono text-xs font-bold text-[#0B3568] dark:text-[#F5FAFF] sm:flex">
            <Clock className="h-4 w-4 text-[#0077C8] dark:text-[#45B5F4]" />
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[11px] font-black">{currentTime || '—'}</span>
              <span className="text-[9px] font-medium text-[#64748B] dark:text-[#8FA9BE]">{currentDate}</span>
            </div>
          </div>

          {/* Theme Toggler */}
          <AnimatedThemeToggler />

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setShowNotifMenu((value) => !value)}
              aria-label="Buka Notifikasi"
              className="relative cursor-pointer rounded-xl border border-[#E2E8F0] dark:border-[rgba(100,180,230,0.16)] bg-[#F4F9FC] dark:bg-[#081D31] p-2 text-[#123D70] dark:text-[#BFD4E4] transition hover:bg-[#0077C8]/10 dark:hover:bg-[#143653] hover:text-[#0077C8] dark:hover:text-[#38BDF8]"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="anim-pop absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF3340] px-1 text-[9px] font-black text-white shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="anim-dropdown absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.18)] bg-white dark:bg-[#0D263E] py-1.5 shadow-2xl sm:w-80 md:w-96 text-text-primary">
                <div className="flex items-center justify-between border-b border-[#EDF2F7] dark:border-[rgba(120,190,235,0.16)] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-text-primary">Notifikasi</span>
                    {unreadCount > 0 && (
                      <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-[#EF3340] dark:text-red-400">
                        {unreadCount} baru
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllNotificationsReadAction()}
                      className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-[#0077C8] dark:text-[#38BDF8] hover:underline"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Tandai dibaca
                    </button>
                  )}
                </div>

                <div className="max-h-72 divide-y divide-[#EDF2F7] dark:divide-[rgba(120,190,235,0.12)] overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-text-muted">
                      Belum ada notifikasi baru
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => (
                      <Link
                        key={notification.id}
                        href={notification.link || '/notifications'}
                        onClick={() => {
                          void markNotificationReadAction(notification.id);
                          setShowNotifMenu(false);
                        }}
                        className={`block p-3 text-left transition hover:bg-[#0077C8]/10 dark:hover:bg-[#143653] ${
                          !notification.isRead ? 'bg-[#0077C8]/5 dark:bg-[#0077C8]/10' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-xs ${
                              !notification.isRead
                                ? 'font-bold text-text-primary'
                                : 'font-medium text-text-secondary'
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#EF3340]" />
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-text-muted">
                          {notification.message}
                        </p>
                      </Link>
                    ))
                  )}
                </div>

                <div className="border-t border-[#EDF2F7] dark:border-[rgba(120,190,235,0.16)] bg-[#F4F9FC] dark:bg-[#081D31]/60 px-4 py-2 text-center">
                  <Link
                    href="/notifications"
                    onClick={() => setShowNotifMenu(false)}
                    className="text-xs font-bold text-[#0077C8] dark:text-[#38BDF8] hover:underline"
                  >
                    Lihat Semua Notifikasi →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu((value) => !value)}
              aria-label="Menu Pengguna"
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-transparent p-1 pl-1 pr-2.5 transition hover:border-[#E2E8F0] dark:hover:border-[rgba(100,180,230,0.16)] hover:bg-[#0077C8]/10 dark:hover:bg-[#143653]"
            >
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={34} status="ONLINE" />
              <div className="hidden max-w-[150px] text-left sm:block">
                <p className="truncate text-xs font-black leading-tight text-[#0B3568] dark:text-[#F5FAFF]">
                  {user.name}
                </p>
                <p className="truncate text-[10px] font-semibold leading-tight text-[#64748B] dark:text-[#9FB6C9]">
                  {roleInfo.shortLabel}
                </p>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-[#64748B] dark:text-[#9FB6C9] sm:block" />
            </button>

            {showUserMenu && (
              <div className="anim-dropdown absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.18)] bg-white dark:bg-[#0D263E] py-1.5 shadow-2xl text-text-primary">
                <div className="mb-0.5 border-b border-[#EDF2F7] dark:border-[rgba(120,190,235,0.16)] px-3.5 py-2.5">
                  <div className="mb-0.5 flex items-center justify-between">
                    <p className="truncate text-xs font-bold text-text-primary">{user.name}</p>
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${roleInfo.badgeClass}`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-text-muted">{user.email || 'Belum ada email'}</p>
                  <p className="mt-0.5 font-mono text-[10px] font-semibold text-text-muted">
                    NIP: {user.employeeId}
                  </p>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-text-secondary transition hover:bg-[#0077C8]/10 dark:hover:bg-[#143653] hover:text-[#0077C8] dark:hover:text-[#38BDF8]"
                >
                  <User className="h-3.5 w-3.5 text-text-muted" />
                  <span>Profil Akun</span>
                </Link>

                <Link
                  href={user.role === 'ADMIN' ? '/admin/settings' : '/profile#keamanan'}
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-text-secondary transition hover:bg-[#0077C8]/10 dark:hover:bg-[#143653] hover:text-[#0077C8] dark:hover:text-[#38BDF8]"
                >
                  <Settings className="h-3.5 w-3.5 text-text-muted" />
                  <span>Pengaturan</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full cursor-pointer items-center gap-2 border-t border-[#EDF2F7] dark:border-[rgba(120,190,235,0.16)] px-3.5 py-2 text-xs font-bold text-[#EF3340] dark:text-red-400 transition hover:bg-red-500/10"
                >
                  <LogOut className="h-3.5 w-3.5 text-[#EF3340]" />
                  <span>Keluar (Logout)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
