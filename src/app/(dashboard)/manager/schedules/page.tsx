import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getManagerSchedules } from '@/server/services/scheduleService';
import { formatJakartaDate } from '@/lib/time';
import { ScheduleManagerClient } from './ScheduleManagerClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ManagerSchedulesPage() {
  await requireRole(['MANAGER']);
  const today = formatJakartaDate();

  const [schedules, shifts, operators, locations] = await Promise.all([
    getManagerSchedules({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    }),
    prisma.shift.findMany({ where: { isActive: true }, orderBy: { startTime: 'asc' } }),
    prisma.user.findMany({ where: { role: 'OPERATOR', isActive: true }, orderBy: { name: 'asc' } }),
    prisma.location.findMany(),
  ]);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="SHIFT PLANNING & DISPATCH"
        title="Manajemen Jadwal Kerja"
        description="Atur rotasi shift 3-regu, penetapan personil per fasilitas ORF Muara Karang, dan alokasi jadwal operasional."
      />

      <ScheduleManagerClient
        initialSchedules={schedules}
        shifts={shifts}
        operators={operators}
        locations={locations}
        today={today}
      />
    </div>
  );
}
