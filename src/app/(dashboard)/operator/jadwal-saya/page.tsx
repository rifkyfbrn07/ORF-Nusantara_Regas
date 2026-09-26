import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { getFinalScheduleStates } from '@/server/services/workStatisticsService';
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
  // PRIVACY: operator hanya melihat jadwal dirinya sendiri. userId diambil
  // dari authenticated session di server — BUKAN dari URL/client.
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

  // Data jadwal FINAL (menggabungkan schedule + cuti/izin/sakit APPROVED).
  const days = await getFinalScheduleStates(user.id, year, month);

  const data = await getRosterMonth({
    year,
    month,
    onlyUserId: user.id, // server-enforced: strictly session user
    includeContacts: false,
    includeTodayStatus: true,
  });

  return <JadwalSayaClient data={data} days={days} operatorName={user.name} operatorPosition={user.position} />;
}
