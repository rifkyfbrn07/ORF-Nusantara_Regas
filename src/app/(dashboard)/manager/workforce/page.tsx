import React from 'react';
import { requireRole } from '@/lib/auth/session';
import { formatJakartaDate } from '@/lib/time';
import { getManpowerStatusSummary } from '@/server/services/workStatusService';
import { getAllShiftsCoverage } from '@/server/services/coverageService';
import { getWorkforceMatrix } from '@/server/services/workforceService';
import {
  WorkforceControlCenterClient,
  SerializableOperatorStatus,
  ShiftCoverageItem,
} from './WorkforceControlCenterClient';

function dateAfter(date: string, days: number) {
  const result = new Date(`${date}T00:00:00+07:00`);
  result.setDate(result.getDate() + days);
  return result.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WorkforcePage({ searchParams }: PageProps) {
  await requireRole(['MANAGER']);
  const params = await searchParams;
  const today = formatJakartaDate();
  const dateQuery = typeof params.date === 'string' ? params.date : today;

  // 7-day matrix range
  const matrixStart = today;
  const matrixEnd = dateAfter(today, 6);

  const [manpowerSummary, shiftCoveragesRaw, matrixRaw] = await Promise.all([
    getManpowerStatusSummary(dateQuery),
    getAllShiftsCoverage(dateQuery),
    getWorkforceMatrix(matrixStart, matrixEnd),
  ]);

  const { counts, operatorStatuses } = manpowerSummary;

  const serializableOperatorStatuses: SerializableOperatorStatus[] = operatorStatuses.map((os) => ({
    operator: os.operator,
    status: os.status,
    statusLabel: os.statusLabel,
    shift: os.shift,
    location: os.location,
    attendance: os.attendance
      ? {
          id: os.attendance.id,
          checkIn: os.attendance.checkIn ? os.attendance.checkIn.toISOString() : null,
          checkOut: os.attendance.checkOut ? os.attendance.checkOut.toISOString() : null,
          lateMinutes: os.attendance.lateMinutes,
          notes: os.attendance.notes,
        }
      : null,
    leave: os.leave,
    isWorkDay: os.isWorkDay,
  }));

  const shiftCoverages: ShiftCoverageItem[] = shiftCoveragesRaw.map((cov) => ({
    shift: cov.shift,
    required: cov.required,
    assigned: cov.assigned,
    present: cov.present,
    missing: cov.missing,
    coveragePercentage: cov.coveragePercentage,
    status: cov.status,
    warningMessage: cov.warningMessage,
  }));

  return (
    <WorkforceControlCenterClient
      currentDate={dateQuery}
      counts={counts}
      shiftCoverages={shiftCoverages}
      operatorStatuses={serializableOperatorStatuses}
      matrixData={matrixRaw}
    />
  );
}
