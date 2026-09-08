import { prisma } from '@/lib/db/prisma';
import { ScheduleStatus } from '@prisma/client';

/**
 * ============================================================================
 * ATTENDANCE SCHEDULE SUMMARY
 * ============================================================================
 * PENTING: Check-in/check-out website BELUM AKTIF SEPENUHNYA. Seluruh
 * statistik "absensi" pada ringkasan ini dihitung dari JADWAL KERJA
 * (Schedule), bukan dari actual check-in. Jangan mengarang data hadir.
 * ============================================================================
 */

export interface ScheduleMonthSummary {
  month: number;
  monthLabel: string;
  totalScheduled: number; // hari kerja terjadwal (Pagi+Malam)
  pagi: number;
  malam: number;
  off: number;
}

export interface ScheduleSummaryData {
  year: number;
  totals: {
    totalScheduled: number;
    pagi: number;
    malam: number;
    off: number;
  };
  perMonth: ScheduleMonthSummary[];
  perOperator: {
    id: string;
    name: string;
    employeeId: string;
    totalScheduled: number;
    pagi: number;
    malam: number;
    off: number;
  }[];
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export async function getScheduleSummary(year: number): Promise<ScheduleSummaryData> {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const schedules = await prisma.schedule.findMany({
    where: { date: { gte: start, lte: end } },
    select: {
      date: true,
      status: true,
      userId: true,
      shift: { select: { code: true, name: true } },
      user: { select: { id: true, name: true, employeeId: true, role: true } },
    },
  });

  const perMonth = MONTH_LABELS.map((label, i) => ({
    month: i + 1,
    monthLabel: label,
    totalScheduled: 0,
    pagi: 0,
    malam: 0,
    off: 0,
  }));

  const operatorMap = new Map<string, { id: string; name: string; employeeId: string; totalScheduled: number; pagi: number; malam: number; off: number }>();

  const shiftKey = (code: string, name: string): 'pagi' | 'malam' | 'off' | 'other' => {
    const c = (code || '').toLowerCase();
    if (c.includes('pagi')) return 'pagi';
    if (c.includes('malam')) return 'malam';
    if (c.includes('off')) return 'off';
    // fallback by nama shift untuk shift non-roster (Shift Pagi/Siang/Malam 8 jam)
    const n = (name || '').toLowerCase();
    if (n.includes('pagi')) return 'pagi';
    if (n.includes('siang')) return 'pagi';
    if (n.includes('malam')) return 'malam';
    return 'other';
  };

  for (const s of schedules) {
    // Hanya operator (bukan manager/admin) yang dihitung dalam ringkasan tenaga kerja
    if (s.user.role !== 'OPERATOR') continue;
    const monthIdx = Number(s.date.slice(5, 7)) - 1;
    const kind = shiftKey(s.shift.code, s.shift.name);
    const isWorkDay = s.status === ScheduleStatus.WORK && (kind === 'pagi' || kind === 'malam');

    if (isWorkDay) {
      perMonth[monthIdx].totalScheduled += 1;
      if (kind === 'pagi') perMonth[monthIdx].pagi += 1;
      else perMonth[monthIdx].malam += 1;
    } else if (kind === 'off' || s.status === ScheduleStatus.OFF) {
      perMonth[monthIdx].off += 1;
    }

    let op = operatorMap.get(s.userId);
    if (!op) {
      op = { id: s.userId, name: s.user.name, employeeId: s.user.employeeId, totalScheduled: 0, pagi: 0, malam: 0, off: 0 };
      operatorMap.set(s.userId, op);
    }
    if (isWorkDay) {
      op.totalScheduled += 1;
      if (kind === 'pagi') op.pagi += 1;
      else op.malam += 1;
    } else if (kind === 'off' || s.status === ScheduleStatus.OFF) {
      op.off += 1;
    }
  }

  const totals = perMonth.reduce(
    (acc, m) => ({
      totalScheduled: acc.totalScheduled + m.totalScheduled,
      pagi: acc.pagi + m.pagi,
      malam: acc.malam + m.malam,
      off: acc.off + m.off,
    }),
    { totalScheduled: 0, pagi: 0, malam: 0, off: 0 }
  );

  return {
    year,
    totals,
    perMonth,
    perOperator: Array.from(operatorMap.values()).sort((a, b) => b.totalScheduled - a.totalScheduled),
  };
}
