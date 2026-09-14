import React from 'react';
import { requireAuth } from '@/lib/auth/session';
import { getRosterMonth, RosterShiftKey } from '@/server/services/rosterService';
import { RosterOperatorClient } from './RosterOperatorClient';
import { PageHeader } from '@/components/ui/PageHeader';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function clampMonth(value: number): number {
  if (!Number.isFinite(value)) return 9; // default September 2026 (data dokumen)
  return Math.min(12, Math.max(1, value));
}

function clampYear(value: number): number {
  if (!Number.isFinite(value)) return 2026;
  return Math.min(2100, Math.max(2020, value));
}

export default async function OperatorRosterPage({ searchParams }: PageProps) {
  // Operator dapat melihat roster (read-only). Contact person TIDAK
  // diserialisasi untuk operator (privacy) — includeContacts=false.
  await requireAuth();

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
    includeContacts: false,
    includeTodayStatus: true,
  });

  return (
    <div className="space-y-6 dashboard-enter">
      <PageHeader
        eyebrow="ROSTER OPERATOR"
        title="Roster Operator"
        description="Jadwal kerja seluruh operator — Pagi (07:00–19:00), Malam (19:00–07:00), OFF (Libur). Operator dapat melihat roster (read-only)."
      />
      <RosterOperatorClient
        year={data.year}
        month={data.month}
        monthLabel={data.monthLabel}
        operators={data.operators}
        daysInMonth={data.daysInMonth}
        coverage={data.coverage}
        availableMonths={data.availableMonths}
        todaySummary={data.todaySummary}
      />
    </div>
  );
}
