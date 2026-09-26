import { prisma } from '@/lib/db/prisma';
import { ScheduleStatus } from '@prisma/client';
import { getApprovedLeaveOverlay } from './workStatisticsService';

/**
 * ============================================================================
 * ATTENDANCE SCHEDULE SUMMARY
 * ============================================================================
 * PENTING: Check-in/check-out website BELUM AKTIF SEPENUHNYA. Seluruh
 * statistik "absensi" pada ringkasan ini dihitung dari JADWAL KERJA
 * (Schedule) + CUTI/IZIN/SAKIT yang sudah APPROVED — bukan dari actual
 * check-in. Jangan mengarang data hadir.
 *
 * Modifikasi: status final per operator per tanggal mengikuti alur yang sama
 * dengan `workStatisticsService` (approved leave menang atas schedule).
 * ============================================================================
 */

export interface ScheduleMonthSummary {
  month: number;
  monthLabel: string;
  totalScheduled: number; // hari kerja terjadwal (Pagi+Malam)
  pagi: number;
  malam: number;
  off: number;
  cuti: number;
  izin: number;
  sakit: number;
}

export interface ScheduleSummaryData {
  year: number;
  totals: {
    totalScheduled: number;
    pagi: number;
    malam: number;
    off: number;
    cuti: number;
    izin: number;
    sakit: number;
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
    cuti: number;
    izin: number;
    sakit: number;
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

  // Peta cuti/izin/sakit APPROVED untuk seluruh operator yang memiliki jadwal.
  const operatorIds = [...new Set(schedules.map((s) => s.userId))];
  const leaveOverlay =
    operatorIds.length > 0
      ? await getApprovedLeaveOverlay(operatorIds, start, end)
      : new Map<string, 'CUTI' | 'IZIN' | 'SAKIT'>();

  const monthInit = () => ({ totalScheduled: 0, pagi: 0, malam: 0, off: 0, cuti: 0, izin: 0, sakit: 0 });
  const perMonth = MONTH_LABELS.map((label, i) => ({ month: i + 1, monthLabel: label, ...monthInit() }));

  const operatorMap = new Map<string, { id: string; name: string; employeeId: string; totalScheduled: number; pagi: number; malam: number; off: number; cuti: number; izin: number; sakit: number }>();

  const shiftKey = (code: string, name: string): 'pagi' | 'malam' | 'off' | 'other' => {
    const c = (code || '').toLowerCase();
    if (c.includes('pagi')) return 'pagi';
    if (c.includes('malam')) return 'malam';
    if (c.includes('off')) return 'off';
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

    // Cuti/Izin/Sakit APPROVED menang atas status schedule (final).
    const leaveKind = leaveOverlay.get(`${s.userId}|${s.date}`);
    if (leaveKind) {
      if (leaveKind === 'CUTI') perMonth[monthIdx].cuti += 1;
      else if (leaveKind === 'IZIN') perMonth[monthIdx].izin += 1;
      else perMonth[monthIdx].sakit += 1;
      let opL = operatorMap.get(s.userId);
      if (!opL) {
        opL = { id: s.userId, name: s.user.name, employeeId: s.user.employeeId, totalScheduled: 0, pagi: 0, malam: 0, off: 0, cuti: 0, izin: 0, sakit: 0 };
        operatorMap.set(s.userId, opL);
      }
      if (leaveKind === 'CUTI') opL.cuti += 1;
      else if (leaveKind === 'IZIN') opL.izin += 1;
      else opL.sakit += 1;
      continue;
    }

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
      op = { id: s.userId, name: s.user.name, employeeId: s.user.employeeId, totalScheduled: 0, pagi: 0, malam: 0, off: 0, cuti: 0, izin: 0, sakit: 0 };
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

  // Pass tambahan: hitung cuti/izin/sakit APPROVED pada tanggal yang TIDAK
  // memiliki schedule row sama sekali (operator sepenuhnya tanpa jadwal).
  const scheduleDateSet = new Set(
    schedules.filter((s) => s.user.role === 'OPERATOR').map((s) => `${s.userId}|${s.date}`)
  );
  const missingIds = new Set<string>();
  for (const key of leaveOverlay.keys()) {
    const uid = key.slice(0, key.indexOf('|'));
    if (!scheduleDateSet.has(key) && !operatorMap.has(uid)) missingIds.add(uid);
  }
  const missingUsers =
    missingIds.size > 0
      ? await prisma.user.findMany({ where: { id: { in: Array.from(missingIds) } }, select: { id: true, name: true, employeeId: true } })
      : [];
  for (const u of missingUsers) {
    operatorMap.set(u.id, { id: u.id, name: u.name, employeeId: u.employeeId, totalScheduled: 0, pagi: 0, malam: 0, off: 0, cuti: 0, izin: 0, sakit: 0 });
  }
  for (const [key, kind] of leaveOverlay) {
    if (scheduleDateSet.has(key)) continue; // sudah dihitung dalam loop schedule
    const sep = key.indexOf('|');
    const uid = key.slice(0, sep);
    const date = key.slice(sep + 1);
    const monthIdx = Number(date.slice(5, 7)) - 1;
    if (monthIdx < 0 || monthIdx > 11) continue;
    const op = operatorMap.get(uid);
    if (!op) continue;
    if (kind === 'CUTI') { perMonth[monthIdx].cuti += 1; op.cuti += 1; }
    else if (kind === 'IZIN') { perMonth[monthIdx].izin += 1; op.izin += 1; }
    else { perMonth[monthIdx].sakit += 1; op.sakit += 1; }
  }

  const totals = perMonth.reduce(
    (acc, m) => ({
      totalScheduled: acc.totalScheduled + m.totalScheduled,
      pagi: acc.pagi + m.pagi,
      malam: acc.malam + m.malam,
      off: acc.off + m.off,
      cuti: acc.cuti + m.cuti,
      izin: acc.izin + m.izin,
      sakit: acc.sakit + m.sakit,
    }),
    { totalScheduled: 0, pagi: 0, malam: 0, off: 0, cuti: 0, izin: 0, sakit: 0 }
  );

  return {
    year,
    totals,
    perMonth,
    perOperator: Array.from(operatorMap.values()).sort((a, b) => b.totalScheduled - a.totalScheduled),
  };
}
