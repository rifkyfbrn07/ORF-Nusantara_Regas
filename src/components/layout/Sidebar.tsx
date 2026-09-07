'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  Users,
  UserPlus,
  ArrowLeftRight,
  Bell,
  ShieldCheck,
  ClipboardList,
  UserCheck,
  Grid2X2,
  LogOut,
  Megaphone,
  Settings,
  Info,
  X,
  ChevronRight,
} from 'lucide-react';
import { SessionUser } from '@/lib/auth/session';
import { logoutAction } from '@/server/actions/authActions';
import { UserAvatar } from '@/components/ui/UserAvatar';

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
}

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
  const router = useRouter();
  const isManager = user.role === 'MANAGER';
  const isAdmin = user.role === 'ADMIN';

  // Manager Navigation Structure matching Mockup Reference
  const managerSections: NavSection[] = [
    {
      title: null, // Standalone top dashboard
      items: [
        { label: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Operations',
      items: [
        { label: 'Jadwal Kerja', href: '/manager/schedules', icon: CalendarDays, hasSub: true },
        { label: 'Absensi', href: '/manager/attendance', icon: Clock },
        { label: 'Pergantian Shift', href: '/manager/requests?tab=shift', icon: ArrowLeftRight },
      ],
    },
    {
      title: 'Workforce',
      items: [
        { label: 'Monitoring Manpower', href: '/manager/workforce', icon: Grid2X2 },
        { label: 'Operator Roster', href: '/manager/operators', icon: Users },
      ],
    },
    {
      title: 'Request',
      items: [
        { label: 'Cuti & Izin', href: '/manager/requests', icon: UserCheck },
      ],
    },
    {
      title: 'Operational',
      items: [
        { label: 'Handover', href: '/manager/handover', icon: ClipboardList },
        { label: 'HSSE', href: '/manager/hsse', icon: ShieldCheck },
        { label: 'Pengumuman', href: '/manager/announcements', icon: Megaphone },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount },
        { label: 'Pengaturan', href: '/profile#keamanan', icon: Settings },
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
        { label: 'Jadwal Saya', href: '/operator/schedule', icon: CalendarDays },
        { label: 'Absensi Saya', href: '/operator/attendance', icon: Clock },
        { label: 'Pergantian Shift', href: '/operator/shift-exchange', icon: ArrowLeftRight },
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
        { label: 'Shift Handover', href: '/operator/handover', icon: ClipboardList },
        { label: 'HSSE Safety Form', href: '/operator/hsse', icon: ShieldCheck },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount },
        { label: 'Pengaturan', href: '/profile', icon: Settings },
      ],
    },
  ];

  // Admin Navigation Structure (Enterprise Control Center)
  const adminSections: NavSection[] = [
    {
      title: 'MAIN',
      items: [{ label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'USER MANAGEMENT',
      items: [
        { label: 'Kelola Pengguna', href: '/admin/users', icon: Users },
        { label: 'Tambah Pengguna', href: '/admin/users/create', icon: UserPlus },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount },
        { label: 'Pengaturan', href: '/admin/settings', icon: Settings },
      ],
    },
    {
      title: 'ABOUT',
      items: [
        { label: 'Tentang FIELDOPS', href: '/admin/about', icon: Info },
      ],
    },
  ];


  const sections = isAdmin ? adminSections : isManager ? managerSections : operatorSections;

  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-[#1E293B] select-none border-r border-[#E2E8F0] relative overflow-hidden">
      {/* 1. LOGO AREA: Exact layout from Mockup */}
      <div className="pt-5 pb-4 px-5 flex items-center justify-between shrink-0 border-b border-slate-100">
        <Link
          href={isManager ? '/manager/dashboard' : isAdmin ? '/admin/dashboard' : '/operator/dashboard'}
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 group"
        >
          <div className="relative shrink-0 flex items-center">
            <Image
              src="/images/regas-.png"
              alt="Pertamina Nusantara Regas"
              width={100}
              height={32}
              className="h-7 w-auto object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-[#0B3568] text-[13px] tracking-wide leading-tight">
              REGAS
            </span>
            <span className="text-[9px] font-black text-[#1769AA] tracking-wider leading-tight">
              FIELDOPS
            </span>
          </div>
        </Link>

        {isMobileDrawer && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. NAVIGATION: White sidebar with Vibrant Blue Active Pill */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 scrollbar-thin">
        {sections.map((sec, idx) => (
          <div key={idx}>
            {/* Section Header */}
            {sec.title && (
              <div className="px-3 mb-1.5 text-[10px] font-bold text-[#64748B] tracking-wider uppercase">
                {sec.title}
              </div>
            )}

            <nav className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/manager/dashboard' &&
                    item.href !== '/operator/dashboard' &&
                    item.href !== '/admin/dashboard' &&
                    pathname.startsWith(item.href.split('?')[0]));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={clsx(
                      'flex items-center justify-between px-3.5 py-2.25 rounded-xl text-[13px] font-semibold transition-all group relative',
                      isActive
                        ? 'bg-[#0066B3] text-white shadow-xs font-bold'
                        : 'text-[#334155] hover:bg-[#EAF4FC] hover:text-[#0066B3]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={clsx(
                          'h-4.5 w-4.5 shrink-0 transition-colors',
                          isActive ? 'text-white' : 'text-[#64748B] group-hover:text-[#0066B3]'
                        )}
                      />
                      <span className="leading-tight">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge && item.badge > 0 ? (
                        <span className="h-4.5 min-w-4.5 px-1.5 rounded-full bg-[#E1251B] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                          {item.badge}
                        </span>
                      ) : null}

                      {'hasSub' in item && item.hasSub && !isActive && (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Decorative Pertamina Flame Orange & Blue Ribbon Accent at bottom-left */}
      <div className="absolute -bottom-2 -left-2 w-16 h-16 pointer-events-none opacity-20 z-0">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <path d="M0 100C0 44.7715 44.7715 0 100 0V100H0Z" fill="#F58220" />
          <path d="M0 100C0 61.3401 38.6599 30 70 30V100H0Z" fill="#1769AA" />
        </svg>
      </div>

      {/* 3. PROFILE AREA: Matching Mockup Pill */}
      <div className="p-3 border-t border-slate-100 bg-white relative z-10">
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#F8FAFC] border border-slate-200/80 hover:bg-[#F1F5F9] transition-colors">
          <Link
            href="/profile"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 min-w-0 flex-1 group"
          >
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={34} className="shrink-0 ring-1 ring-slate-200" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#0B3568] truncate group-hover:text-[#1769AA] transition-colors">
                {user.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">
                  {user.role}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-[10px] text-slate-400 font-mono truncate">{user.employeeId}</span>
              </div>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            title="Keluar (Logout)"
            className="p-1.5 text-slate-400 hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition cursor-pointer shrink-0 ml-1"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
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
        {/* Dark Backdrop Overlay */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />

        {/* Slide-out Drawer Panel */}
        <aside
          className={clsx(
            'absolute left-0 top-0 bottom-0 w-[260px] max-w-[85vw] h-full shadow-2xl transition-transform duration-300 ease-in-out',
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
    <aside className="w-[250px] h-screen fixed left-0 top-0 border-r border-[#E2E8F0] shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-40">
      {sidebarContent}
    </aside>
  );
}
