'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Clock, Users, Bell, Menu } from 'lucide-react';
import { clsx } from 'clsx';
import { SessionUser } from '@/lib/auth/session';

interface MobileNavProps {
  user: SessionUser;
  unreadCount?: number;
  onOpenDrawer?: () => void;
}

export function MobileNav({ user, unreadCount = 0, onOpenDrawer }: MobileNavProps) {
  const pathname = usePathname();
  const isManager = user.role === 'MANAGER';
  const isAdmin = user.role === 'ADMIN';

  const managerLinks = [
    { label: 'Home', href: '/manager/dashboard', icon: LayoutDashboard },
    { label: 'Jadwal', href: '/manager/schedules', icon: CalendarDays },
    { label: 'Manpower', href: '/manager/workforce', icon: Users },
    { label: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount },
  ];

  const operatorLinks = [
    { label: 'Home', href: '/operator/dashboard', icon: LayoutDashboard },
    { label: 'Jadwal', href: '/operator/schedule', icon: CalendarDays },
    { label: 'Absensi', href: '/operator/attendance', icon: Clock },
    { label: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount },
  ];

  const adminLinks = [
    { label: 'Home', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Akun', href: '/admin/users', icon: Users },
    { label: 'Notifikasi', href: '/notifications', icon: Bell, badge: unreadCount },
  ];

  const links = isAdmin ? adminLinks : isManager ? managerLinks : operatorLinks;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#DCE5EF] z-40 px-2 py-1.5 flex items-center justify-around shadow-lg"
    >
      {links.map((link) => {
        const Icon = link.icon;
        const isActive =
          pathname === link.href ||
          (link.href !== '/manager/dashboard' &&
            link.href !== '/operator/dashboard' &&
            link.href !== '/admin/dashboard' &&
            pathname.startsWith(link.href));

        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all relative',
              isActive
                ? 'text-[#0066B3] font-black'
                : 'text-[#64748B] hover:text-[#0066B3]'
            )}
          >
            <div className="relative">
              <Icon className={clsx('h-5 w-5', isActive ? 'text-[#0066B3]' : 'text-[#64748B]')} />
              {link.badge && link.badge > 0 ? (
                <span className="absolute -top-1 -right-2 h-3.5 w-3.5 bg-[#E1251B] text-white text-[8px] font-black rounded-full flex items-center justify-center ring-1 ring-white">
                  {link.badge}
                </span>
              ) : null}
            </div>
            <span className="mt-0.5">{link.label}</span>
          </Link>
        );
      })}

      {/* Menu / Drawer Toggle Button */}
      <button
        onClick={onOpenDrawer}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-semibold text-[#5F718A] hover:text-[#0B3568] transition cursor-pointer"
        aria-label="Buka Menu Lengkap"
      >
        <Menu className="h-5 w-5 text-[#5F718A]" />
        <span className="mt-0.5">Menu</span>
      </button>
    </nav>
  );
}
