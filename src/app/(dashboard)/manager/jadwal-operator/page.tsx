import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { getRosterMonth, RosterShiftKey } from '@/server/services/rosterService';
import { JadwalOperatorClient } from './JadwalOperatorClient';
import { PageHeader } from '@/components/ui/PageHeader';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function clampMonth(value: number): number {
  if (!Number.isFinite(value)) return 9; // default September 2026 (data dokumen)
  return Math.min(12, Math.max(1, value));
}

function clampYear(value: number): number {
  if (!Number.isFinite(value)) return 2026;
  return Math.min(2100, Math.max(2020, value));
}

export default async function ManagerJadwalOperatorPage({ searchParams }: PageProps) {
  // Otorisasi server-side: hanya MANAGER/ADMIN yang dapat memuat halaman ini.
  // Contact person hanya diserialisasi untuk peran tersebut (keputusan privacy
  // di server, bukan client).
  await requireRole(['MANAGER', 'ADMIN']);

  const params = await searchParams;
  const year = clampYear(typeof params.year === 'string' ? Number(params.year) : NaN);
  const month = clampMonth(typeof params.month === 'string' ? Number(params.month) : NaN);
  const shiftFilter = (
    typeof params.shift === 'string' && ['PAGI', 'MALAM', 'OFF'].includes(params.shift)
      ? params.shift
      : 'ALL'
  ) as RosterShiftKey | 'ALL';

  const data = await getRosterMonth({
    year,
    month,
    shiftFilter,
    includeContacts: true,
    includeTodayStatus: true,
  });

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="ORF MUARA KARANG"
        title="Jadwal Operator"
        description="Roster bulanan operator ORF Muara Karang — Pg (07.00 - 19.00), Mlm (19.00 - 07.00), Off (Libur). Terintegrasi dengan Shift, Attendance, dan Monitoring Manpower."
      />

      <JadwalOperatorClient
        data={data}
        monthNames={MONTH_NAMES}
        showContacts
      />
    </div>
  );
}
