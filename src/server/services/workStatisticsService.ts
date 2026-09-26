import { prisma } from '@/lib/db/prisma';
import { RequestStatus } from '@prisma/client';

/**
 * ============================================================================
 * WORK STATISTICS SERVICE — jembatan statistik jadwal yang konsisten.
 * ============================================================================
 * Tujuan: Dashboard Operator, Dashboard Admin, Dashboard Manager, dan
 * "Jadwal Saya" membaca statistik yang dihitung dari SATU runtime yang sama:
 *
 *   1. Cuti/Izin/Sakit APPROVED SELALU menang atas schedule (final status).
 *   2. Schedule WORK + shift ORF_PAGI  -> PAGI
 *   3. Schedule WORK + shift ORF_MALAM -> MALAM
 *   4. Schedule WORK + shift lainnya   -> WORK
 *   5. Schedule OFF                    -> OFF
 *   6. Tidak ada schedule row          -> tidak dihitung (bukan 0 mengarang)
 *
 * Tidak ada duplikasi logika per-halaman dan tidak ada dummy/static data.
 * ============================================================================
 */

export type FinalDayKind = 'PAGI' | 'MALAM' | 'WORK' | 'OFF' | 'CUTI' | 'IZIN' | 'SAKIT';

export interface FinalDayState {
  date: string;
  weekday: string;
  shiftKey: FinalDayKind | 'OFF' | null;
  shiftCode: string | null;
  shiftName: string | null;
  startTime: string | null;
  endTime: string | null;
  scheduleStatus: 'WORK' | 'OFF';
  /** Status FINAL (setelah overlay cuti/izin/sakit): null = tidak ada data. */
  finalStatus: FinalDayKind | null;
  notes: string | null;
  /** true bila jadwal pernah berubah (cuti disetujui / tukar hari OFF / diperbarui). */
  changed: boolean;
}

export interface MonthlyWorkStatistics {
  year: number;
  month: number;
  totalDays: number;
  work: number;
  pagi: number;
  malam: number;
  off: number;
  cuti: number;
  izin: number;
  sakit: number;
  noData: number;
}

const WEEKDAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function weekdayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return WEEKDAYS_ID[d.getUTCDay()];
}

function shiftKindOf(code: string, name: string): FinalDayKind | 'OFF' | null {
  const c = (code || '').toLowerCase();
  if (c.includes('pagi')) return 'PAGI';
  if (c.includes('malam')) return 'MALAM';
  if (c.includes('off')) return 'OFF';
  const n = (name || '').toLowerCase();
  if (n.includes('pagi') || n.includes('siang')) return 'PAGI';
  if (n.includes('malam')) return 'MALAM';
  if (n.includes('off')) return 'OFF';
  return null;
}

const CHANGE_PATTERN = /(cuti|izin|sakit|disetujui|ditolak|tukar|diperbarui|duplikasi|update)/i;


/**
 * Peta tanggal -> jenis cuti berdasarkan LeaveRequest APPROVED.
 * Berbeda dengan getOperatorWorkStatus (per hari), helper ini untuk
 * rentang waktu (bulan/tahun) agar satu query efisien untuk seluruh periode.
 */
export async function getApprovedLeaveOverlay(
  userIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, 'CUTI' | 'IZIN' | 'SAKIT'>> {
  if (userIds.length === 0) return new Map();
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      userId: { in: userIds },
      status: RequestStatus.APPROVED,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { userId: true, type: true, startDate: true, endDate: true },
  });

  const overlay = new Map<string, 'CUTI' | 'IZIN' | 'SAKIT'>();
  for (const l of leaves) {
    const kind: 'CUTI' | 'IZIN' | 'SAKIT' =
      l.type === 'SICK' ? 'SAKIT' : l.type === 'PERMISSION' ? 'IZIN' : 'CUTI';
    const cursor = new Date(`${l.startDate}T00:00:00+07:00`);
    const end = new Date(`${l.endDate}T00:00:00+07:00`);
    if (end < cursor) continue;
    let guard = 0;
    while (cursor <= end && guard < 400) {
      const date = cursor.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      if (date >= startDate && date <= endDate) {
        overlay.set(`${l.userId}|${date}`, kind);
      }
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }
  }
  return overlay;
}

/**
 * Enumerate status FINAL per tanggal untuk satu operator pada satu bulan.
 * Dipakai oleh "Jadwal Saya", Dashboard Operator, dan grafik hari kerja.
 */
export async function getFinalScheduleStates(
  userId: string,
  year: number,
  month: number
): Promise<FinalDayState[]> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = `${year}-${pad2(month)}-01`;
  const monthEnd = `${year}-${pad2(month)}-${pad2(daysInMonth)}`;

  const [schedules, overlay] = await Promise.all([
    prisma.schedule.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      include: { shift: { select: { code: true, name: true, startTime: true, endTime: true } } },
      orderBy: { date: 'asc' },
    }),
    getApprovedLeaveOverlay([userId], monthStart, monthEnd),
  ]);

  const byDate = new Map(schedules.map((s) => [s.date, s]));
  const days: FinalDayState[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${pad2(month)}-${pad2(d)}`;
    const s = byDate.get(date);
    const leaveKind = overlay.get(`${userId}|${date}`) ?? null;

    let shiftKey: FinalDayKind | 'OFF' | null = null;
    let finalStatus: FinalDayKind | null = null;

    if (leaveKind) {
      shiftKey = s ? shiftKindOf(s.shift.code, s.shift.name) : null;
      finalStatus = leaveKind;
    } else if (s) {
      const kind = shiftKindOf(s.shift.code, s.shift.name);
      shiftKey = kind;
      if (s.status === 'OFF' || kind === 'OFF') {
        finalStatus = 'OFF';
      } else {
        finalStatus = kind ?? 'WORK';
      }
    }

    days.push({
      date,
      weekday: weekdayOf(date),
      shiftKey,
      shiftCode: s?.shift.code ?? null,
      shiftName: s?.shift.name ?? null,
      startTime: s?.shift.startTime ?? null,
      endTime: s?.shift.endTime ?? null,
      scheduleStatus: s?.status ?? 'OFF',
      finalStatus,
      notes: s?.notes ?? null,
      changed: Boolean(s?.notes && CHANGE_PATTERN.test(s.notes)) || Boolean(leaveKind),
    });
  }

  return days;
}


/**
 * Statistik hari kerja dalam 1 bulan — dihitung dari schedule FINAL.
 * Tidak menghitung: duplicate schedule, request PENDING/REJECTED,
 * atau schedule yang sudah digantikan oleh perubahan resmi.
 */
export async function getMonthlyWorkStatistics(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyWorkStatistics> {
  const days = await getFinalScheduleStates(userId, year, month);

  const stats: MonthlyWorkStatistics = {
    year,
    month,
    totalDays: days.length,
    work: 0,
    pagi: 0,
    malam: 0,
    off: 0,
    cuti: 0,
    izin: 0,
    sakit: 0,
    noData: 0,
  };

  for (const day of days) {
    switch (day.finalStatus) {
      case 'PAGI':
        stats.pagi += 1;
        stats.work += 1;
        break;
      case 'MALAM':
        stats.malam += 1;
        stats.work += 1;
        break;
      case 'WORK':
        stats.work += 1;
        break;
      case 'OFF':
        stats.off += 1;
        break;
      case 'CUTI':
        stats.cuti += 1;
        break;
      case 'IZIN':
        stats.izin += 1;
        break;
      case 'SAKIT':
        stats.sakit += 1;
        break;
      default:
        stats.noData += 1;
        break;
    }
  }

  return stats;
}

/**
 * Statistik 12 bulan untuk Dashboard Operator (grafik Hari Kerja per Bulan).
 */
export async function getOperatorYearlyWorkStatistics(userId: string, year: number) {
  const months = await Promise.all(
    Array.from({ length: 12 }, (_, i) => getMonthlyWorkStatistics(userId, year, i + 1))
  );
  return {
    year,
    perMonth: months.map((m) => ({
      month: m.month,
      work: m.work,
      pagi: m.pagi,
      malam: m.malam,
      off: m.off,
      cuti: m.cuti,
      izin: m.izin,
      sakit: m.sakit,
      noData: m.noData,
    })),
  };
}
