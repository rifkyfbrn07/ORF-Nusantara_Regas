import { prisma } from '@/lib/db/prisma';
import { AttendanceStatus, ScheduleStatus } from '@prisma/client';
import { formatJakartaDate } from '@/lib/time';
import { getOperatorWorkStatus } from './workStatusService';

/**
 * ============================================================================
 * ROSTER SERVICE — Jadwal Operator ORF Muara Karang
 * ============================================================================
 * View khusus DI ATAS model Schedule/Shift/User existing (tanpa model duplikat).
 * Shift roster reusable: ORF_PAGI (07:00-19:00), ORF_MALAM (19:00-07:00,
 * overnight), ORF_OFF (Libur). Status work-status memakai centralized engine
 * `getOperatorWorkStatus` (HADIR / BELUM ABSEN / TERLAMBAT / CUTI / SAKIT /
 * IZIN / OFF / ABSENT) — tidak ada logic status kedua.
 *
 * PRIVACY: contact person (phone) hanya di-serialize jika caller berperan
 * MANAGER/ADMIN (diatur oleh halaman server-side, bukan client).
 * ============================================================================
 */

export const ORF_SHIFT_CODES = ['ORF_PAGI', 'ORF_MALAM', 'ORF_OFF'] as const;

export type RosterShiftKey = 'PAGI' | 'MALAM' | 'OFF';

export interface RosterDayCell {
  date: string; // "YYYY-MM-DD"
  day: number;
  weekday: string; // Sen, Sel, Rab, ...
  shiftKey: RosterShiftKey | null; // null jika bukan shift roster ORF
  shiftCode: string | null;
  shiftName: string | null;
  startTime: string | null;
  endTime: string | null;
  status: ScheduleStatus;
  notes: string | null;
  isHoliday: boolean;
  isToday: boolean;
}

export interface RosterOperatorRow {
  id: string;
  name: string;
  employeeId: string;
  position: string;
  /** Hanya terisi untuk MANAGER/ADMIN (lihat catatan privacy di atas). */
  phone: string | null;
  team: string | null; // A | B | C (dari notes roster)
  positionSuffix: string | null; // Supervisor/Lead Operator | DCS | Field
  hsseMarshall: boolean; // tanda `*` pada dokumen
  todayStatus: {
    status: AttendanceStatus;
    statusLabel: string;
  } | null;
  days: RosterDayCell[];
  counts: { pagi: number; malam: number; off: number };
}

export interface RosterDayCoverage {
  date: string;
  day: number;
  weekday: string;
  pagi: number;
  malam: number;
  off: number;
  isHoliday: boolean;
  isToday: boolean;
}

export interface RosterMonthData {
  year: number;
  month: number;
  monthLabel: string;
  daysInMonth: number;
  availableMonths: { year: number; month: number }[];
  operators: RosterOperatorRow[];
  coverage: RosterDayCoverage[];
  todaySummary: {
    date: string;
    hadir: number;
    terlambat: number;
    belumAbsen: number;
    absent: number;
    cuti: number;
    sakit: number;
    izin: number;
    off: number;
  } | null;
  shiftRequirements: {
    key: RosterShiftKey;
    label: string;
    startTime: string;
    endTime: string;
    requiredCount: number;
  }[];
}

const WEEKDAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/**
 * Hari libur nasional. Sumber dokumen roster (September-Oktbr 2026_Rev.pdf)
 * memiliki legend "Hari libur Nasional" namun tidak menandai tanggal libur
 * apa pun pada September/Oktober 2026 — sehingga tidak ada tanggal yang
 * dikarang di sini. Tambahkan entri "YYYY-MM-DD": "Nama Libur" bila ada
 * data resmi.
 */
const NATIONAL_HOLIDAYS: Record<string, string> = {};

function weekdayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return WEEKDAYS_ID[d.getUTCDay()];
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Parse notes roster terstruktur: "Roster ORF | Team A | DCS | HSSE Marshall" */
function parseRosterNotes(notes: string | null): {
  isRoster: boolean;
  team: string | null;
  positionSuffix: string | null;
  hsseMarshall: boolean;
} {
  if (!notes) return { isRoster: false, team: null, positionSuffix: null, hsseMarshall: false };
  const segments = notes.split(' | ').map((s) => s.trim());
  if (segments[0] !== 'Roster ORF') {
    return { isRoster: false, team: null, positionSuffix: null, hsseMarshall: false };
  }
  let team: string | null = null;
  let positionSuffix: string | null = null;
  let hsseMarshall = false;
  for (const seg of segments.slice(1)) {
    if (/^Team [A-Z]$/.test(seg)) team = seg.replace('Team ', '');
    else if (seg === 'HSSE Marshall') hsseMarshall = true;
    else if (seg) positionSuffix = seg;
  }
  return { isRoster: true, team, positionSuffix, hsseMarshall };
}

function shiftKeyOf(code: string): RosterShiftKey | null {
  if (code === 'ORF_PAGI') return 'PAGI';
  if (code === 'ORF_MALAM') return 'MALAM';
  if (code === 'ORF_OFF') return 'OFF';
  return null;
}

/**
 * Mengambil roster bulanan operator ORF.
 * - `onlyUserId`: mode "jadwal saya" — operator hanya melihat dirinya sendiri.
 * - `operatorFilter` / `shiftFilter`: filter tampilan untuk MANAGER/ADMIN.
 * - `includeContacts`: hanya true untuk MANAGER/ADMIN (keputusan server-side).
 */
export async function getRosterMonth(options: {
  year: number;
  month: number;
  onlyUserId?: string;
  operatorFilter?: string; // userId
  shiftFilter?: RosterShiftKey | 'ALL';
  includeContacts: boolean;
  includeTodayStatus: boolean;
}): Promise<RosterMonthData> {
  const { year, month } = options;
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = `${year}-${pad2(month)}-01`;
  const monthEnd = `${year}-${pad2(month)}-${pad2(daysInMonth)}`;
  const today = formatJakartaDate();

  // Validasi bulan agar tidak out-of-range
  if (month < 1 || month > 12) throw new Error('Bulan tidak valid.');

  const dateWhere: { gte: string; lte: string } = { gte: monthStart, lte: monthEnd };
  if (options.onlyUserId) {
    // Mode mandiri: hanya jadwal milik user dari session (server-enforced).
    const own = await prisma.schedule.findMany({
      where: { userId: options.onlyUserId, date: dateWhere },
      include: {
        shift: true,
        user: { select: { id: true, name: true, employeeId: true, position: true, phone: true } },
      },
      orderBy: { date: 'asc' },
    });

    const owner = own[0]?.user;
    const row = await buildOperatorRow({
      user: owner
        ? owner
        : (await prisma.user.findUnique({
            where: { id: options.onlyUserId },
            select: { id: true, name: true, employeeId: true, position: true, phone: true },
          }))!,
      schedules: own,
      daysInMonth,
      year,
      month,
      today,
      includeTodayStatus: options.includeTodayStatus,
      includeContacts: options.includeContacts,
    });

    return {
      year,
      month,
      monthLabel: `${MONTH_NAMES_ID[month - 1]} ${year}`,
      daysInMonth,
      availableMonths: await getAvailableRosterMonths(),
      operators: row ? [row] : [],
      coverage: [],
      todaySummary: null,
      shiftRequirements: [],
    };
  }

  // Mode roster penuh (MANAGER/ADMIN): operator roster = user yang memiliki
  // jadwal dengan shift roster ORF pada bulan terkait.
  const schedules = await prisma.schedule.findMany({
    where: {
      date: dateWhere,
      shift: { code: { in: [...ORF_SHIFT_CODES] } },
      user: { isActive: true },
    },
    include: {
      shift: true,
      user: { select: { id: true, name: true, employeeId: true, position: true, phone: true } },
    },
    orderBy: [{ date: 'asc' }],
  });

  // Distinct operator (urut employeeId = urut dokumen)
  const userMap = new Map<string, (typeof schedules)[number]['user']>();
  for (const s of schedules) userMap.set(s.user.id, s.user);
  const operators = Array.from(userMap.values()).sort((a, b) =>
    a.employeeId.localeCompare(b.employeeId)
  );

  const filteredOperators = options.operatorFilter
    ? operators.filter((op) => op.id === options.operatorFilter)
    : operators;

  const rows = (
    await Promise.all(
      filteredOperators.map((op) =>
        buildOperatorRow({
          user: op,
          schedules: schedules.filter((s) => s.user.id === op.id),
          daysInMonth,
          year,
          month,
          today,
          includeTodayStatus: options.includeTodayStatus,
          includeContacts: options.includeContacts,
          shiftFilter: options.shiftFilter,
        })
      )
    )
  ).filter((r): r is RosterOperatorRow => r !== null);

  // Coverage harian (hitungan jadwal per shift) — sebelum filter shift agar
  // coverage tetap menggambarkan roster penuh.
  const coverage: RosterDayCoverage[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${pad2(month)}-${pad2(d)}`;
    coverage.push({
      date,
      day: d,
      weekday: weekdayOf(date),
      pagi: schedules.filter((s) => s.date === date && shiftKeyOf(s.shift.code) === 'PAGI').length,
      malam: schedules.filter((s) => s.date === date && shiftKeyOf(s.shift.code) === 'MALAM').length,
      off: schedules.filter((s) => s.date === date && shiftKeyOf(s.shift.code) === 'OFF').length,
      isHoliday: Boolean(NATIONAL_HOLIDAYS[date]),
      isToday: date === today,
    });
  }

  // Ringkasan status hari ini (centralized work-status engine)
  let todaySummary: RosterMonthData['todaySummary'] = null;
  if (options.includeTodayStatus && today >= monthStart && today <= monthEnd) {
    const summary = {
      date: today,
      hadir: 0,
      terlambat: 0,
      belumAbsen: 0,
      absent: 0,
      cuti: 0,
      sakit: 0,
      izin: 0,
      off: 0,
    };
    for (const op of filteredOperators) {
      const ws = await getOperatorWorkStatus(op.id, today);
      switch (ws.status) {
        case AttendanceStatus.HADIR:
          summary.hadir += 1;
          break;
        case AttendanceStatus.TERLAMBAT:
          summary.terlambat += 1;
          break;
        case AttendanceStatus.BELUM_ABSEN:
          summary.belumAbsen += 1;
          break;
        case AttendanceStatus.ABSENT:
          summary.absent += 1;
          break;
        case AttendanceStatus.CUTI:
          summary.cuti += 1;
          break;
        case AttendanceStatus.SAKIT:
          summary.sakit += 1;
          break;
        case AttendanceStatus.IZIN:
          summary.izin += 1;
          break;
        case AttendanceStatus.OFF:
          summary.off += 1;
          break;
      }
    }
    todaySummary = summary;
  }

  const shifts = await prisma.shift.findMany({
    where: { code: { in: [...ORF_SHIFT_CODES] }, isActive: true },
    orderBy: { startTime: 'asc' },
  });
  const shiftRequirements = shifts.map((s) => ({
    key: shiftKeyOf(s.code) as RosterShiftKey,
    label: s.name,
    startTime: s.startTime,
    endTime: s.endTime,
    requiredCount: s.requiredCount,
  }));

  return {
    year,
    month,
    monthLabel: `${MONTH_NAMES_ID[month - 1]} ${year}`,
    daysInMonth,
    availableMonths: await getAvailableRosterMonths(),
    operators: rows,
    coverage,
    todaySummary,
    shiftRequirements,
  };
}

/**
 * Bulan-bulan yang memiliki data roster (shift ORF) — untuk dropdown pemilih
 * bulan. Idempotent terhadap data existing.
 */
export async function getAvailableRosterMonths(): Promise<{ year: number; month: number }[]> {
  const schedules = await prisma.schedule.findMany({
    where: { shift: { code: { in: [...ORF_SHIFT_CODES] } } },
    select: { date: true },
    distinct: ['date'],
  });
  const set = new Set<string>();
  for (const s of schedules) {
    const [y, m] = s.date.split('-');
    set.add(`${y}-${m}`);
  }
  return Array.from(set)
    .map((key) => ({ year: Number(key.split('-')[0]), month: Number(key.split('-')[1]) }))
    .sort((a, b) => a.year - b.year || a.month - b.month);
}

interface BuildRowParams {
  user: { id: string; name: string; employeeId: string; position: string; phone: string | null };
  schedules: {
    date: string;
    status: ScheduleStatus;
    notes: string | null;
    shift: { code: string; name: string; startTime: string; endTime: string };
  }[];
  daysInMonth: number;
  year: number;
  month: number;
  today: string;
  includeTodayStatus: boolean;
  includeContacts: boolean;
  shiftFilter?: RosterShiftKey | 'ALL';
}

async function buildOperatorRow(params: BuildRowParams): Promise<RosterOperatorRow | null> {
  const { user, schedules, daysInMonth, year, month, today } = params;

  // Metadata roster dari notes baris mana pun milik operator ini
  const meta = schedules
    .map((s) => parseRosterNotes(s.notes))
    .find((m) => m.isRoster) || { isRoster: false, team: null, positionSuffix: null, hsseMarshall: false };

  const scheduleByDate = new Map(schedules.map((s) => [s.date, s]));
  const counts = { pagi: 0, malam: 0, off: 0 };
  const days: RosterDayCell[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${pad2(month)}-${pad2(d)}`;
    const s = scheduleByDate.get(date);
    const key = s ? shiftKeyOf(s.shift.code) : null;
    if (key === 'PAGI') counts.pagi += 1;
    if (key === 'MALAM') counts.malam += 1;
    if (key === 'OFF') counts.off += 1;

    // Filter shift (hanya berlaku untuk view manajerial)
    if (params.shiftFilter && params.shiftFilter !== 'ALL' && key !== params.shiftFilter) {
      days.push({
        date,
        day: d,
        weekday: weekdayOf(date),
        shiftKey: null,
        shiftCode: s?.shift.code ?? null,
        shiftName: s?.shift.name ?? null,
        startTime: s?.shift.startTime ?? null,
        endTime: s?.shift.endTime ?? null,
        status: s?.status ?? ScheduleStatus.OFF,
        notes: s?.notes ?? null,
        isHoliday: Boolean(NATIONAL_HOLIDAYS[date]),
        isToday: date === today,
      });
      continue;
    }

    days.push({
      date,
      day: d,
      weekday: weekdayOf(date),
      shiftKey: key,
      shiftCode: s?.shift.code ?? null,
      shiftName: s?.shift.name ?? null,
      startTime: s?.shift.startTime ?? null,
      endTime: s?.shift.endTime ?? null,
      status: s?.status ?? ScheduleStatus.OFF,
      notes: s?.notes ?? null,
      isHoliday: Boolean(NATIONAL_HOLIDAYS[date]),
      isToday: date === today,
    });
  }

  let todayStatus: RosterOperatorRow['todayStatus'] = null;
  if (params.includeTodayStatus) {
    const ws = await getOperatorWorkStatus(user.id, today);
    todayStatus = { status: ws.status, statusLabel: ws.statusLabel };
  }

  return {
    id: user.id,
    name: user.name,
    employeeId: user.employeeId,
    position: user.position,
    // PRIVACY: contact person hanya di-serialize untuk MANAGER/ADMIN
    // (keputusan otorisasi dibuat server-side oleh halaman pemanggil).
    phone: params.includeContacts ? user.phone : null,
    team: meta.team,
    positionSuffix: meta.positionSuffix,
    hsseMarshall: meta.hsseMarshall,
    todayStatus,
    days,
    counts,
  };
}
