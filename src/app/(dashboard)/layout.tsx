import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getUserNotifications } from '@/server/services/notificationService';
import { prisma } from '@/lib/db/prisma';
import { getPendingLeaveApprovalCountForUser, hasApprovalInboxScope } from '@/server/services/leaveService';

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
  const [{ notifications, unreadCount }, pendingApprovalCount, hasApprovalInbox] = await Promise.all([
    getUserNotifications(session.id, 10),
    getPendingLeaveApprovalCountForUser(session.id),
    session.role === 'ADMIN' ? Promise.resolve(false) : hasApprovalInboxScope(session.id),
  ]);
  const hasTeamOperatorScope = session.role === 'OPERATOR'
    && Boolean(await prisma.teamConfig.count({
      where: { OR: [{ reviewerId: session.id }, { teamLeadId: session.id }] },
    }));

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
      hasTeamOperatorScope={hasTeamOperatorScope}
      hasApprovalInbox={hasApprovalInbox}
      pendingApprovalCount={pendingApprovalCount}
    >
      {children}
    </DashboardShell>
  );

}
