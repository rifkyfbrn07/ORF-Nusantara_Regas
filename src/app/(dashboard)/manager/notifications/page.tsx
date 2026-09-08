import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getAllNotifications } from '@/server/services/notificationService';
import { PersonalNotificationClient } from './PersonalNotificationClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ManagerNotificationsPage() {
  const session = await requireRole(['MANAGER', 'ADMIN']);

  const [recipients, recent] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, ...(session.role === 'MANAGER' ? { role: 'OPERATOR' } : {}) },
      select: { id: true, name: true, username: true, role: true, position: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    }),
    getAllNotifications(30),
  ]);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="COMMUNICATION"
        title="Notifikasi Personal"
        description="Kirim pemberitahuan langsung ke satu, beberapa, atau seluruh operator. Notifikasi personal hanya dapat dilihat oleh penerima."
      />

      <PersonalNotificationClient
        senderRole={session.role as 'ADMIN' | 'MANAGER'}
        recipients={recipients.map((r) => ({
          id: r.id,
          label: `${r.name} (@${r.username || '-'}) · ${r.role}`,
          role: r.role,
        }))}
        recent={recent.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          userName: n.user?.name || '-',
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
