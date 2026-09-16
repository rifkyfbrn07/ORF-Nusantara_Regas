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
  ArrowLeftRight,
  Bell,
  ShieldCheck,
  ClipboardList,
  UserCheck,
  Grid2X2,
  Megaphone,
  Settings,
  Target,
  X,
  ChevronRight,
} from 'lucide-react';
import { SessionUser } from '@/lib/auth/session';

interface SidebarProps {
  user: SessionUser;
  unreadCount?: number;
  personnelCount?: number;
  isMobileDrawer?: boolean;
  isOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: number;
  hasSub?: boolean;
}

interface NavSection {
  title: string | null;
  items: NavItem[];
}

export function Sidebar({
  user,
  unreadCount = 0,
  personnelCount = 19,
  isMobileDrawer = false,
  isOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const isManager = user.role === 'MANAGER';
  const isAdmin = user.role === 'ADMIN';

  // Admin Navigation Structure
  const adminSections: NavSection[] = [
    {
      title: 'MAIN',
      items: [
        { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'User Management', href: '/admin/users', icon: Users, hasSub: true },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { label: 'Jadwal Kerja', href: '/manager/schedules', icon: CalendarDays, hasSub: true },
        { label: 'Jadwal Operator', href: '/manager/jadwal-operator', icon: CalendarClock, hasSub: true },
        { label: 'Absensi', href: '/manager/attendance', icon: Clock, hasSub: true },
        { label: 'Monitoring Manpower', href: '/manager/workforce', icon: Grid2X2 },
        { label: 'Operator Roster', href: '/manager/operators', icon: Users, hasSub: true },
      ],
    },
    {
      title: 'PLANNING',
      items: [
        { label: 'Program Kerja', href: '/manager/program-kerja', icon: Target },
      ],
    },
    {
      title: 'REQUEST & OPS',
      items: [
        { label: 'Cuti & Izin', href: '/manager/requests', icon: UserCheck },
        { label: 'Handover', href: '/manager/handover', icon: ClipboardList },
        { label: 'HSSE', href: '/manager/hsse', icon: ShieldCheck },
        { label: 'Pengumuman', href: '/manager/announcements', icon: Megaphone },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount },
        { label: 'Laporan', href: '/manager/reports', icon: ClipboardList },
        { label: 'Audit Log', href: '/manager/audit-logs', icon: ShieldCheck },
        { label: 'Pengaturan', href: '/admin/settings', icon: Settings },
      ],
    },
  ];

  // Manager Navigation Structure
  const managerSections: NavSection[] = [
    {
      title: 'MAIN',
      items: [
        { label: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { label: 'Jadwal Kerja', href: '/manager/schedules', icon: CalendarDays, hasSub: true },
        { label: 'Jadwal Operator', href: '/manager/jadwal-operator', icon: CalendarClock, hasSub: true },
        { label: 'Absensi', href: '/manager/attendance', icon: Clock, hasSub: true },
        { label: 'Monitoring Manpower', href: '/manager/workforce', icon: Grid2X2 },
        { label: 'Operator Roster', href: '/manager/operators', icon: Users, hasSub: true },
        { label: 'Pergantian Shift', href: '/manager/requests?tab=shift', icon: ArrowLeftRight },
      ],
    },
    {
      title: 'PLANNING',
      items: [
        { label: 'Program Kerja', href: '/manager/program-kerja', icon: Target },
      ],
    },
    {
      title: 'REQUEST & OPS',
      items: [
        { label: 'Cuti & Izin', href: '/manager/requests', icon: UserCheck },
        { label: 'Handover', href: '/manager/handover', icon: ClipboardList },
        { label: 'HSSE', href: '/manager/hsse', icon: ShieldCheck },
        { label: 'Pengumuman', href: '/manager/announcements', icon: Megaphone },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount },
        { label: 'Laporan', href: '/manager/reports', icon: ClipboardList },
        { label: 'Audit Log', href: '/manager/audit-logs', icon: ShieldCheck },
        { label: 'Pengaturan', href: '/profile#keamanan', icon: Settings },
      ],
    },
  ];

  // Operator Navigation Structure
  const operatorSections: NavSection[] = [
    {
      title: 'MAIN',
      items: [
        { label: 'Dashboard', href: '/operator/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { label: 'Jadwal Saya', href: '/operator/schedule', icon: CalendarDays, hasSub: true },
        { label: 'Roster Bulanan', href: '/operator/jadwal-saya', icon: CalendarClock, hasSub: true },
        { label: 'Roster Operator', href: '/operator/roster', icon: Users, hasSub: true },
        { label: 'Absensi Saya', href: '/operator/attendance', icon: Clock },
        { label: 'Pergantian Shift', href: '/operator/shift-exchange', icon: ArrowLeftRight },
      ],
    },
    {
      title: 'PLANNING',
      items: [
        { label: 'Program Kerja', href: '/operator/program-kerja', icon: Target },
      ],
    },
    {
      title: 'REQUEST & OPS',
      items: [
        { label: 'Cuti & Izin', href: '/operator/requests', icon: UserCheck },
        { label: 'Shift Handover', href: '/operator/handover', icon: ClipboardList },
        { label: 'HSSE Safety Form', href: '/operator/hsse', icon: ShieldCheck },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount },
        { label: 'Pengaturan', href: '/profile', icon: Settings },
      ],
    },
  ];

  const sections = isAdmin ? adminSections : isManager ? managerSections : operatorSections;
  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href.split('?')[0]));

  const checkIsActive = (itemHref: string): boolean => {
    const cleanItemHref = itemHref.split('?')[0];
    if (pathname === cleanItemHref) return true;
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
    <div className="flex flex-col h-full bg-[#FFFFFF] dark:bg-[#081A2B] text-text-primary select-none border-r border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] relative overflow-hidden shadow-xs">
      {/* 1. BRAND AREA — Logo + Title + Pulse Badge + 3-Color Ribbon */}
      <div className="pt-5 pb-4 px-4.5 flex flex-col shrink-0 border-b border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] bg-[#FFFFFF] dark:bg-[#081A2B] relative z-10">
        <div className="flex items-center justify-between">
          <Link
            href={isAdmin ? '/admin/dashboard' : isManager ? '/manager/dashboard' : '/operator/dashboard'}
            onClick={onCloseMobile}
            className="flex items-center gap-2 group"
          >
            <div className="relative shrink-0 flex items-center">
              <Image
                src="/images/regas-.png"
                alt="Pertamina Nusantara Regas"
                width={132}
                height={36}
                className="regas-logo h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
                priority
              />
            </div>
          </Link>

          {isMobileDrawer && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-[#0077C8]/10 dark:hover:bg-white/10 transition cursor-pointer"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Brand Title & Online Badge */}
        <div className="mt-2.5 flex flex-col">
          <span className="text-[12px] font-black tracking-tight text-[#0B3568] dark:text-[#E7F1FA] uppercase leading-tight">
            DISTRIBUSI GAS &amp; ORF
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#69BE28] shadow-[0_0_8px_#69BE28] animate-pulse-subtle" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#69BE28]">
              SYSTEM ONLINE
            </span>
          </div>
        </div>

        {/* Signature 3-Color Slanted Accent Bar */}
        <div className="sidebar-logo-accent mt-2.5">
          <span />
          <span />
          <span />
        </div>
      </div>

      {/* 2. NAVIGATION MENU */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-thin relative z-10">
        {sections.map((sec, idx) => (
          <div key={idx}>
            {sec.title && (
              <div className="px-3 mb-1.5 text-[10px] font-extrabold text-[#64748B] dark:text-[#7895AD] tracking-wider uppercase">
                {sec.title}
              </div>
            )}

            <nav className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = checkIsActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={clsx(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all duration-150 group relative',
                      isActive
                        ? 'bg-[#087CC9] text-white font-bold shadow-[0_4px_16px_rgba(8,124,201,0.4),inset_0_1px_0_rgba(255,255,255,0.25)]'
                        : 'text-[#123D70] dark:text-[#B9CCDE] hover:bg-[#F4F9FC] dark:hover:bg-[#0088D8]/10 hover:text-[#0077C8] dark:hover:text-[#EAF6FF]'
                    )}
                  >
                    {/* Active Left Indicator Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#69BE28] rounded-r-full shadow-xs" />
                    )}

                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        strokeWidth={2}
                        className={clsx(
                          'h-4.5 w-4.5 shrink-0 transition-transform duration-150 group-hover:scale-108',
                          isActive
                            ? 'text-white'
                            : 'text-[#0077C8] dark:text-[#55B9F2] group-hover:text-[#0077C8] dark:group-hover:text-[#38A9EA]'
                        )}
                      />
                      <span className="truncate leading-tight">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && item.badge > 0 ? (
                        <span className="h-4.5 min-w-4.5 px-1 rounded-full bg-[#EF3340] text-white text-[9.5px] font-black flex items-center justify-center shadow-xs animate-pulse-subtle">
                          {item.badge}
                        </span>
                      ) : null}

                      {'hasSub' in item && item.hasSub && (
                        <ChevronRight
                          className={clsx(
                            'w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5',
                            isActive ? 'text-white/80' : 'text-[#64748B] dark:text-[#7895AD]'
                          )}
                        />
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* 3. OPERATION STATUS CONSOLE CARD (Bottom Panel) */}
      <div className="p-3 relative z-10 shrink-0 border-t border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] bg-[#FFFFFF] dark:bg-[#081A2B]">
        <div className="bg-[#F4F9FC] dark:bg-[#0D263E] rounded-2xl border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] p-3 shadow-xs relative overflow-hidden">
          {/* Card Title */}
          <div className="text-[9.5px] font-black uppercase tracking-wider text-[#64748B] dark:text-[#8EA7BD] mb-2 px-1">
            OPERATION STATUS
          </div>

          <div className="space-y-1.5">
            {/* OCC Ready */}
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/80 dark:bg-[#12314D]/80 border border-[#E2E8F0]/80 dark:border-[rgba(120,190,235,0.12)] text-[11px] font-bold text-[#0B3568] dark:text-[#E7F1FA]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#69BE28] shadow-[0_0_8px_#69BE28]" />
                OCC READY
              </span>
              <ChevronRight className="w-3 h-3 text-[#64748B] dark:text-[#7895AD]" />
            </div>

            {/* ORF Active */}
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/80 dark:bg-[#12314D]/80 border border-[#E2E8F0]/80 dark:border-[rgba(120,190,235,0.12)] text-[11px] font-bold text-[#0B3568] dark:text-[#E7F1FA]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#69BE28] shadow-[0_0_8px_#69BE28]" />
                ORF ACTIVE
              </span>
              <ChevronRight className="w-3 h-3 text-[#64748B] dark:text-[#7895AD]" />
            </div>

            {/* Personnel Count */}
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/80 dark:bg-[#12314D]/80 border border-[#E2E8F0]/80 dark:border-[rgba(120,190,235,0.12)] text-[11px] font-bold text-[#0B3568] dark:text-[#E7F1FA]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#69BE28] shadow-[0_0_8px_#69BE28]" />
                {personnelCount} PERSONNEL
              </span>
              <ChevronRight className="w-3 h-3 text-[#64748B] dark:text-[#7895AD]" />
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Bottom-Left Ribbon Accent */}
      <div className="corner-ribbon-bl" />
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
          className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
        <aside
          className={clsx(
            'absolute left-0 top-0 bottom-0 w-[240px] max-w-[80vw] h-full shadow-2xl transition-transform duration-300 ease-in-out',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </aside>
      </div>
    );
  }

  // Desktop Fixed Sidebar (240px width)
  return (
    <aside className="w-[240px] h-screen fixed left-0 top-0 border-r border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] shadow-[2px_0_14px_rgba(11,53,104,0.03)] dark:shadow-none z-40">
      {sidebarContent}
    </aside>
  );
}
