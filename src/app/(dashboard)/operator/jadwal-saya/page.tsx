import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getFinalScheduleStates, getApprovedLeaveOverlay } from '@/server/services/workStatisticsService';
import { getRosterMonth } from '@/server/services/rosterService';
import { JadwalSayaClient } from './JadwalSayaClient';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export default async function OperatorJadwalSayaPage({ searchParams }: PageProps) {
  // PRIVACY: jadwal pribadi hanya untuk session user; tab "Jadwal Operator"
  // bersifat READ-ONLY (tanpa aksi edit/approve) dengan filter server-side.
  const user = await requireAuth();

  const params = await searchParams;
  const now = new Date();
  const year = clamp(
    typeof params.year === 'string' ? Number(params.year) : NaN,
    2020, 2100, now.getFullYear()
  );
  const month = clamp(
    typeof params.month === 'string' ? Number(params.month) : NaN,
    1, 12, now.getMonth() + 1
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // Data jadwal FINAL milik user yang login (memakai engine statistik yang sama
  // dengan Dashboard Operator).
  const days = await getFinalScheduleStates(user.id, year, month);

  const data = await getRosterMonth({
    year,
    month,
    onlyUserId: user.id, // server-enforced: strictly session user
    includeContacts: false,
    includeTodayStatus: true,
  });

  // ---- Tab "Jadwal Operator" (read-only) ----
  // Sumber data SAMA dengan roster manajerial: getRosterMonth tanpa onlyUserId
  // (semua operator), plus daftar operator aktif untuk pencarian nama/
  // username/employeeId dan overlay cuti/izin/sakit APPROVED yang konsisten
  // dengan engine statistik (workStatisticsService).
  const [allOperatorUsers, allRoster] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'OPERATOR', isActive: true },
      select: { id: true, name: true, username: true, employeeId: true, position: true },
      orderBy: { employeeId: 'asc' },
    }),
    getRosterMonth({
      year,
      month,
      includeContacts: false,
      includeTodayStatus: false,
    }),
  ]);

  const leaveOverlay = await getApprovedLeaveOverlay(
    allOperatorUsers.map((u) => u.id),
    monthStart,
    monthEnd
  );
  const leaveOverlayPlain = Object.fromEntries(leaveOverlay);

  return (
    <JadwalSayaClient
      data={data}
      days={days}
      operatorName={user.name}
      operatorPosition={user.position}
      allOperatorUsers={allOperatorUsers}
      allRosterOperators={allRoster.operators}
      leaveOverlay={leaveOverlayPlain}
    />
  );
}
