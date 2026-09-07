import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getUserNotifications } from '@/server/services/notificationService';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session: SessionUser;
  try {
    session = await requireAuth();
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      redirect('/login?session=expired');
    }
    throw error;
  }

  // Fetch unread notifications for this user
  const { notifications, unreadCount } = await getUserNotifications(session.id, 10);

  const serializableNotifications = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    link: n.link,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <DashboardShell
      user={session}
      notifications={serializableNotifications}
      unreadCount={unreadCount}
    >
      {children}
    </DashboardShell>
  );

}

