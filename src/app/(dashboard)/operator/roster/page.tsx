import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { getRosterMonth } from '@/server/services/rosterService';
import { RosterOperatorClient } from './RosterOperatorClient';
import { PageHeader } from '@/components/ui/PageHeader';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * ROSTER OPERATOR — seluruh operator.
 * Berbeda dengan "Jadwal Saya" (hanya jadwal session user), halaman ini
 * menampilkan roster SELURUH operator aktif sesuai authorization. Data diambil
 * dengan `includeUnscheduledOperators` agar operator yang belum dijadwalkan
 * pada bulan terkait TETAP tampil (tidak hilang dari roster).
 */
export default async function OperatorRosterPage({ searchParams }: PageProps) {
  await requireAuth();

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

  const data = await getRosterMonth({
    year,
    month,
    includeUnscheduledOperators: true, // seluruh operator aktif tetap tampil
    includeContacts: false, // privacy: operator read-only tanpa contact
    includeTodayStatus: true,
  });

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="OPERATIONAL WORKFORCE ROSTER"
        title="Roster Operator"
        description="Pembagian jadwal kerja seluruh operator ORF Muara Karang — Pg (07.00 - 19.00), Mlm (19.00 - 07.00), Off (Libur), dan operator yang belum dijadwalkan."
      />
      <RosterOperatorClient data={data} />
    </div>
  );
}
