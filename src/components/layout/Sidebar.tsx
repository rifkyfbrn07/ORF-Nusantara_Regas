'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  Clock,
  Users,
  UserPlus,
  ArrowLeftRight,
  Bell,
  ShieldCheck,
  ClipboardList,
  UserCheck,
  Grid2X2,
  Megaphone,
  Settings,
  Info,
  Target,
  X,
  ChevronRight,
} from 'lucide-react';
import { SessionUser } from '@/lib/auth/session';

interface SidebarProps {
  user: SessionUser;
  unreadCount?: number;
  isMobileDrawer?: boolean;
  isOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  hasSub?: boolean;
  /** Semantic icon tone (corporate palette) */
  tone?: 'blue' | 'navy' | 'green' | 'amber' | 'orange' | 'red' | 'slate';
}

/** Warna icon semantik — konsisten & corporate */
const TONE_ICON_CLASS: Record<string, string> = {
  blue: 'text-[#0066B3]',
  navy: 'text-[#123B6D]',
  green: 'text-emerald-600',
  amber: 'text-amber-500',
  orange: 'text-[#F58220]',
  red: 'text-[#DC2626]',
  slate: 'text-slate-500',
};

interface NavSection {
  title: string | null;
  items: NavItem[];
}

export function Sidebar({
  user,
  unreadCount = 0,
  isMobileDrawer = false,
  isOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const isManager = user.role === 'MANAGER';
  const isAdmin = user.role === 'ADMIN';

  // Manager Navigation Structure
  const managerSections: NavSection[] = [
    {
      title: null,
      items: [
        { label: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Jadwal Kerja', href: '/manager/schedules', icon: CalendarDays, hasSub: true, tone: 'blue' },
        { label: 'Jadwal Operator', href: '/manager/jadwal-operator', icon: CalendarClock, tone: 'blue' },
        { label: 'Absensi', href: '/manager/attendance', icon: Clock, tone: 'green' },
        { label: 'Pergantian Shift', href: '/manager/requests?tab=shift', icon: ArrowLeftRight, tone: 'amber' },
      ],
    },
    {
      title: 'Planning',
      items: [
        { label: 'Program Kerja', href: '/manager/program-kerja', icon: Target, tone: 'orange' },
      ],
    },
    {
      title: 'Workforce',
      items: [
        { label: 'Monitoring Manpower', href: '/manager/workforce', icon: Grid2X2, tone: 'navy' },
        { label: 'Operator Roster', href: '/manager/operators', icon: Users, tone: 'navy' },
      ],
    },
    {
      title: 'Request',
      items: [
        { label: 'Cuti & Izin', href: '/manager/requests', icon: UserCheck, tone: 'amber' },
      ],
    },
    {
      title: 'Operational',
      items: [
        { label: 'Handover', href: '/manager/handover', icon: ClipboardList, tone: 'navy' },
        { label: 'HSSE', href: '/manager/hsse', icon: ShieldCheck, tone: 'red' },
        { label: 'Pengumuman', href: '/manager/announcements', icon: Megaphone, tone: 'orange' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount, tone: 'blue' },
        { label: 'Laporan', href: '/manager/reports', icon: ClipboardList, tone: 'blue' },
        { label: 'Audit Log', href: '/manager/audit-logs', icon: ShieldCheck, tone: 'slate' },
        { label: 'Pengaturan', href: '/profile#keamanan', icon: Settings, tone: 'slate' },
      ],
    },
  ];

  // Operator Navigation Structure
  const operatorSections: NavSection[] = [
    {
      title: null,
      items: [
        { label: 'Dashboard', href: '/operator/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Jadwal Saya', href: '/operator/schedule', icon: CalendarDays, tone: 'blue' },
        { label: 'Roster Bulanan', href: '/operator/jadwal-saya', icon: CalendarClock, tone: 'blue' },
        { label: 'Absensi Saya', href: '/operator/attendance', icon: Clock, tone: 'green' },
        { label: 'Pergantian Shift', href: '/operator/shift-exchange', icon: ArrowLeftRight, tone: 'amber' },
      ],
    },
    {
      title: 'Request',
      items: [
        { label: 'Cuti & Izin', href: '/operator/requests', icon: UserCheck },
      ],
    },
    {
      title: 'Operational',
      items: [
        { label: 'Shift Handover', href: '/operator/handover', icon: ClipboardList, tone: 'navy' },
        { label: 'HSSE Safety Form', href: '/operator/hsse', icon: ShieldCheck, tone: 'red' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount, tone: 'blue' },
        { label: 'Pengaturan', href: '/profile', icon: Settings, tone: 'slate' },
      ],
    },
  ];

  // Admin Navigation Structure — full access: seluruh fitur manager & operator
  const adminSections: NavSection[] = [
    {
      title: 'MAIN',
      items: [{ label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, tone: 'blue' }],
    },
    {
      title: 'USER MANAGEMENT',
      items: [
        { label: 'Kelola Pengguna', href: '/admin/users', icon: Users, tone: 'navy' },
        { label: 'Tambah Pengguna', href: '/admin/users/create', icon: UserPlus, tone: 'navy' },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { label: 'Jadwal Kerja', href: '/manager/schedules', icon: CalendarDays, hasSub: true, tone: 'blue' },
        { label: 'Jadwal Operator', href: '/manager/jadwal-operator', icon: CalendarClock, tone: 'blue' },
        { label: 'Absensi', href: '/manager/attendance', icon: Clock, tone: 'green' },
        { label: 'Monitoring Manpower', href: '/manager/workforce', icon: Grid2X2, tone: 'navy' },
        { label: 'Operator Roster', href: '/manager/operators', icon: Users, tone: 'navy' },
      ],
    },
    {
      title: 'PLANNING',
      items: [
        { label: 'Program Kerja', href: '/manager/program-kerja', icon: Target, tone: 'orange' },
      ],
    },
    {
      title: 'REQUEST & OPS',
      items: [
        { label: 'Cuti & Izin', href: '/manager/requests', icon: UserCheck, tone: 'amber' },
        { label: 'Handover', href: '/manager/handover', icon: ClipboardList, tone: 'navy' },
        { label: 'HSSE', href: '/manager/hsse', icon: ShieldCheck, tone: 'red' },
        { label: 'Pengumuman', href: '/manager/announcements', icon: Megaphone, tone: 'orange' },
        { label: 'Notifikasi Personal', href: '/manager/notifications', icon: Bell, tone: 'blue' },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Notifikasi Saya', href: '/notifications', icon: Bell, badge: unreadCount, tone: 'blue' },
        { label: 'Laporan', href: '/manager/reports', icon: ClipboardList, tone: 'blue' },
        { label: 'Audit Log', href: '/manager/audit-logs', icon: ShieldCheck, tone: 'slate' },
        { label: 'Pengaturan', href: '/admin/settings', icon: Settings, tone: 'slate' },
      ],
    },
    {
      title: 'ABOUT',
      items: [
        { label: 'Tentang Distribusi Gas & ORF', href: '/admin/about', icon: Info, tone: 'slate' },
      ],
    },
  ];

  const sections = isAdmin ? adminSections : isManager ? managerSections : operatorSections;

  // Flatten all navigation pathnames to enable longest-match resolution
  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href.split('?')[0]));

  /**
   * Precise active-route matching:
   * Prevents parent/sibling overlap like `/admin/users` and `/admin/users/create`.
   */
  const checkIsActive = (itemHref: string): boolean => {
    const cleanItemHref = itemHref.split('?')[0];

    // 1. Exact match with pathname
    if (pathname === cleanItemHref) {
      // If item has a query string (e.g. ?tab=shift), require exact match if possible
      if (itemHref.includes('?')) {
        // Query param matching handled if exact
        return true;
      }
      return true;
    }

    // 2. Subroute matching (e.g. /manager/operators/123 -> /manager/operators)
    // Only match as prefix if NO OTHER nav item in the sidebar has a longer/more specific match
    if (!itemHref.includes('?') && pathname.startsWith(cleanItemHref + '/')) {
      const hasMoreSpecificItem = allHrefs.some(
        (otherHref) =>
          otherHref !== cleanItemHref &&
          otherHref.length > cleanItemHref.length &&
          (pathname === otherHref || pathname.startsWith(otherHref + '/'))
      );
      return !hasMoreSpecificItem;
    }

    return false;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-slate-800 select-none border-r border-slate-200/80">
      {/* 1. BRAND / LOGO AREA */}
      <div className="h-14 px-4 flex items-center justify-between shrink-0 border-b border-slate-100">
        <Link
          href={isManager ? '/manager/dashboard' : isAdmin ? '/admin/dashboard' : '/operator/dashboard'}
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 group"
        >
          <div className="relative shrink-0 flex items-center">
            <Image
              src="/images/regas-.png"
              alt="Pertamina Nusantara Regas"
              width={90}
              height={28}
              className="h-6 w-auto object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-[#0B3568] text-xs tracking-tight leading-tight">
              Distribusi Gas &amp; ORF
            </span>
            <span className="text-[8.5px] font-black text-[#1769AA] tracking-wider leading-none uppercase">
              Operational Workforce
            </span>
          </div>
        </Link>

        {isMobileDrawer && (
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. NAVIGATION MENU */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5 scrollbar-thin">
        {sections.map((sec, idx) => (
          <div key={idx}>
            {/* Section Header */}
            {sec.title && (
              <div className="px-2.5 mb-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                {sec.title}
              </div>
            )}

            <nav className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = checkIsActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={clsx(
                      'flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors group relative',
                      isActive
                        ? 'bg-[#0066B3] text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-[#0B3568]'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={clsx(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-white'
                            : item.tone
                              ? `${TONE_ICON_CLASS[item.tone]} group-hover:text-[#0066B3]`
                              : 'text-slate-400 group-hover:text-[#0066B3]'
                        )}
                      />
                      <span className="truncate leading-tight">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && item.badge > 0 ? (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-[#E1251B] text-white text-[9px] font-black flex items-center justify-center">
                          {item.badge}
                        </span>
                      ) : null}

                      {'hasSub' in item && item.hasSub && !isActive && (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* 3. SUBTLE FOOTER TAG (No duplicate profile, natural whitespace) */}
      <div className="px-4 py-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between shrink-0 bg-[#FBFDFE]">
        <span className="font-semibold text-slate-500">v2.4.0</span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Enterprise</span>
      </div>
    </div>
  );

  // Mobile Drawer
  if (isMobileDrawer) {
    return (
      <div
        className={clsx(
          'fixed inset-0 z-50 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
        <aside
          className={clsx(
            'absolute left-0 top-0 bottom-0 w-[240px] max-w-[80vw] h-full shadow-xl transition-transform duration-300 ease-in-out',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </aside>
      </div>
    );
  }

  // Desktop Fixed Sidebar
  return (
    <aside className="w-[230px] h-screen fixed left-0 top-0 border-r border-slate-200/80 shadow-xs z-40 bg-white">
      {sidebarContent}
    </aside>
  );
}
