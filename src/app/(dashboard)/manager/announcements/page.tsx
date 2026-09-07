import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { formatJakartaDate } from '@/lib/time';
import { AnnouncementsClient } from './AnnouncementsClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ManagerAnnouncementsPage() {
  await requireRole(['MANAGER']);
  const todayStr = formatJakartaDate();

  const [announcements, shifts, operators] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        createdBy: { select: { name: true } },
      },
      take: 50,
    }),
    prisma.shift.findMany({ where: { isActive: true }, orderBy: { startTime: 'asc' } }),
    prisma.user.findMany({
      where: { role: 'OPERATOR', isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, employeeId: true },
    }),
  ]);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="INTERNAL OPERATIONAL COMMUNICATIONS"
        title="Pengumuman"
        description="Terbitkan pengumuman resmi untuk seluruh operator, regu shift tertentu, atau personil terpilih di ORF Muara Karang."
      />

      <AnnouncementsClient
        announcements={announcements.map((a) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          priority: a.priority,
          targetType: a.targetType,
          targetId: a.targetId,
          startAt: a.startAt.toISOString(),
          endAt: a.endAt ? a.endAt.toISOString() : null,
          isActive: a.isActive,
          createdByName: a.createdBy.name,
          createdAt: a.createdAt.toISOString(),
        }))}
        shifts={shifts.map((s) => ({ id: s.id, name: s.name }))}
        operators={operators}
        todayStr={todayStr}
      />
    </div>
  );
}
