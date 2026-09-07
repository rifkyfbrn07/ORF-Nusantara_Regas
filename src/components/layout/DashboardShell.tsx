'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { MobileNav } from '@/components/layout/MobileNav';
import type { SessionUser } from '@/lib/auth/session';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: Date | string;
}

interface DashboardShellProps {
  user: SessionUser;
  notifications: NotificationItem[];
  unreadCount: number;
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  notifications,
  unreadCount,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsMobileDrawerOpen(false);
  }


  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileDrawerOpen]);


  return (
    <div className="fieldops-shell min-h-screen flex flex-col bg-[#F3F6FA] text-[#132238] overflow-x-hidden relative">
      {/* Desktop Sidebar (Fixed Left, 250px) */}
      <div className="hidden md:block">
        <Sidebar user={user} unreadCount={unreadCount} />
      </div>

      {/* Mobile Drawer Sidebar */}
      <div className="md:hidden">
        <Sidebar
          user={user}
          unreadCount={unreadCount}
          isMobileDrawer
          isOpen={isMobileDrawerOpen}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
        />
      </div>

      {/* Main Content Area (Offset by 250px on desktop) */}
      <div className="md:pl-[250px] flex flex-col min-h-screen w-full transition-all duration-200">
        {/* Top Header */}
        <TopHeader
          user={user}
          notifications={notifications}
          unreadCount={unreadCount}
          onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
        />

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-[1440px] w-full mx-auto dashboard-enter pb-20 md:pb-6">
          {children}
        </main>

      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        user={user}
        unreadCount={unreadCount}
        onOpenDrawer={() => setIsMobileDrawerOpen(true)}
      />
    </div>
  );
}
