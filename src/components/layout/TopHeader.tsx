'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  LogOut,
  User,
  Settings,
  CheckCheck,
  Clock,
  Calendar,
  Search,
} from 'lucide-react';
import { SessionUser } from '@/lib/auth/session';
import { formatIndonesianDate } from '@/lib/time';
import { logoutAction } from '@/server/actions/authActions';
import { markAllNotificationsReadAction, markNotificationReadAction } from '@/server/actions/notificationActions';
import { UserAvatar } from '@/components/ui/UserAvatar';

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
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
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

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
  };

  return (
    <header className="h-14 bg-white border-b border-[#E2E8F0] sticky top-0 z-30 px-3 md:px-6 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)] w-full">

      {/* Left: Mobile Menu Trigger + Search Bar from Mockup */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xs sm:max-w-sm">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-[#0B3568] hover:bg-slate-100 transition cursor-pointer shrink-0"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search Input Box */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Q  Dashboard"
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#F8FAFC] border border-slate-200 rounded-full text-[#1E293B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA] transition"
          />
        </div>
      </div>

      {/* Right Side: Operational Pill + Date + Time + Notification + Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Green Status Pill (Mockup: ORF Muara Karang · Operational) */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-subtle" />
          <span>ORF Muara Karang</span>
          <span className="text-emerald-300">·</span>
          <span>Operational</span>
        </div>

        {/* Date Pill (Mockup: Sen, 07 Sep 2026) */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8FAFC] border border-slate-200 text-[#64748B] text-xs font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatIndonesianDate()}</span>
        </div>

        {/* Time Pill (Mockup: 09:25 WIB) */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8FAFC] border border-slate-200 text-[#0B3568] text-xs font-mono font-bold">
          <Clock className="w-3.5 h-3.5 text-[#1769AA]" />
          <span>{currentTime || '09:25:00 WIB'}</span>
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            aria-label="Buka Notifikasi"
            className="p-2 rounded-full text-[#64748B] hover:bg-slate-100 hover:text-[#0B3568] relative transition cursor-pointer"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 ? (
              <span className="anim-pop absolute top-1 right-1 h-4 min-w-4 px-1 bg-[#DC2626] text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>

          {/* Notifications Dropdown Card */}
          {showNotifMenu && (
            <div className="anim-dropdown absolute right-0 mt-2 w-72 sm:w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] py-2 z-50">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#0B3568]">Notifikasi</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200">
                      {unreadCount} baru
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-bold text-[#1769AA] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Tandai dibaca
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#64748B]">
                    Belum ada notifikasi baru
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notif) => (
                    <Link
                      key={notif.id}
                      href={notif.link || '/notifications'}
                      onClick={() => {
                        markNotificationReadAction(notif.id);
                        setShowNotifMenu(false);
                      }}
                      className={`block p-3 text-left transition hover:bg-slate-50 ${
                        !notif.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs ${!notif.isRead ? 'font-bold text-[#0B3568]' : 'font-medium text-[#1E293B]'}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className="h-2 w-2 rounded-full bg-[#DC2626] shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                    </Link>
                  ))
                )}
              </div>

              <div className="px-4 py-2 border-t border-slate-100 text-center bg-[#F8FAFC]">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifMenu(false)}
                  className="text-xs font-bold text-[#1769AA] hover:underline"
                >
                  Lihat Semua Notifikasi →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar Dropdown (Mockup Pill on far right) */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="Menu Pengguna"
            className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-slate-200"
          >
            <UserAvatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              size={32}
              status="ONLINE"
              className="ring-1 ring-slate-200"
            />
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-[#0B3568] leading-tight truncate max-w-[120px]">{user.name}</p>
              <p className="text-[10px] font-semibold text-[#64748B]">
                {user.role === 'MANAGER' ? 'Manager' : user.role === 'ADMIN' ? 'Admin' : 'Operator'}
              </p>
            </div>
          </button>

          {showUserMenu && (
            <div className="anim-dropdown absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] py-1.5 z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-[#0B3568]">{user.name}</p>
                <p className="text-[11px] text-[#64748B] truncate">{user.email}</p>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5 font-mono">NIP: {user.employeeId}</p>
              </div>

              <Link
                href="/profile"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#1E293B] hover:bg-slate-50 hover:text-[#0B3568]"
              >
                <User className="h-4 w-4 text-[#64748B]" />
                <span>Profil Akun</span>
              </Link>

              <Link
                href="/profile#keamanan"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#1E293B] hover:bg-slate-50 hover:text-[#0B3568]"
              >
                <Settings className="h-4 w-4 text-[#64748B]" />
                <span>Pengaturan</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 border-t border-slate-100 mt-1 cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-red-500" />
                <span>Keluar (Logout)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
