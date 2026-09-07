import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getAllAttendanceRecords } from '@/server/services/attendanceService';
import { formatJakartaDate } from '@/lib/time';
import { AttendanceManagerClient } from './AttendanceManagerClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ManagerAttendancePage() {
  await requireRole(['MANAGER']);
  const today = formatJakartaDate();

  const [attendanceData, shifts, operators] = await Promise.all([
    getAllAttendanceRecords({ limit: 100 }),
    prisma.shift.findMany({ where: { isActive: true } }),
    prisma.user.findMany({ where: { role: 'OPERATOR', isActive: true }, select: { id: true, name: true, employeeId: true } }),
  ]);

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="ATTENDANCE & COMPLIANCE"
        title="Monitoring & Rekapitulasi Absensi"
        description="Pantau kehadiran real-time, tingkat keterlambatan, verifikasi GPS lokasi, dan riwayat presensi operator ORF Muara Karang."
      />

      <AttendanceManagerClient
        initialRecords={attendanceData.records}
        shifts={shifts}
        operators={operators}
        today={today}
      />
    </div>
  );
}
