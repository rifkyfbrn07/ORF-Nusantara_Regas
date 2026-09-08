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
  ChevronDown,
} from 'lucide-react';
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

  const roleInfo = getRoleInfo(user.role);

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
    <header className="h-14 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-3 sm:px-5 lg:px-6 flex items-center justify-between gap-4 md:gap-8 w-full shadow-2xs">
      {/* 1. LEFT: Mobile Menu Trigger + Search Bar */}
      <div className="flex items-center gap-2.5 flex-1 max-w-xs sm:max-w-sm lg:max-w-md min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded-lg text-[#0F315A] hover:bg-slate-100 transition cursor-pointer shrink-0"
          aria-label="Buka Menu Navigasi"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search (berfungsi — terhubung /api/search) */}
        <GlobalSearch />
      </div>

      {/* 2. RIGHT: Facility Status + Clock + Notification Bell + User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Facility Indicator (ORF Muara Karang · Operational) */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-subtle" />
          <span className="text-[11px] font-bold text-emerald-800">ORF Muara Karang</span>
          <span className="text-emerald-300">·</span>
          <span className="text-[11px] font-medium text-emerald-700">Operational</span>
        </div>

        {/* Live Clock Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[#0F315A] text-xs font-mono font-bold shrink-0">
          <Clock className="w-3.5 h-3.5 text-[#0066B3]" />
          <span>{currentTime || '09:25:00 WIB'}</span>
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            aria-label="Buka Notifikasi"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#0F315A] relative transition cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="anim-pop absolute top-1 right-1 h-3.5 min-w-3.5 px-1 bg-[#E1251B] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>

          {/* Notifications Dropdown Card */}
          {showNotifMenu && (
            <div className="anim-dropdown absolute right-0 mt-2 w-72 sm:w-80 md:w-96 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
              <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#0F315A]">Notifikasi</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200">
                      {unreadCount} baru
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-bold text-[#0066B3] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Tandai dibaca
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
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
                        !notif.isRead ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs ${!notif.isRead ? 'font-bold text-[#0F315A]' : 'font-medium text-slate-700'}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#E1251B] shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                    </Link>
                  ))
                )}
              </div>

              <div className="px-3.5 py-1.5 border-t border-slate-100 text-center bg-slate-50/60">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifMenu(false)}
                  className="text-xs font-bold text-[#0066B3] hover:underline"
                >
                  Lihat Semua Notifikasi →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 3. DYNAMIC USER PROFILE (Pure Circular Avatar, Name & Role) */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="Menu Pengguna"
            className="flex items-center gap-2 p-1 pl-1 pr-2 rounded-lg hover:bg-slate-100/80 transition cursor-pointer border border-transparent hover:border-slate-200"
          >
            <UserAvatar
              name={user.name}
              avatarUrl={user.avatarUrl}
              size={32}
              status="ONLINE"
            />
            <div className="text-left hidden sm:block max-w-[140px]">
              <p className="text-xs font-bold text-[#0F315A] leading-tight truncate">
                {user.name}
              </p>
              <p className="text-[10px] font-semibold text-slate-500 leading-tight">
                {roleInfo.shortLabel}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="anim-dropdown absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-bold text-[#0F315A] truncate">{user.name}</p>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${roleInfo.badgeClass}`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
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
        </div>
      </div>
    </header>
  );
}
