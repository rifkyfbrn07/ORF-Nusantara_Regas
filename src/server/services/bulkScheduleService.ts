import { prisma } from '@/lib/db/prisma';
import { ScheduleStatus } from '@prisma/client';
import { recordAuditLog } from './auditService';
import { WORK_PATTERNS, generatePatternShifts, PatternShift } from '@/lib/schedule/workPatterns';

/**
 * BULK SCHEDULE — pembuatan & import jadwal dalam jumlah banyak.
 * Semua operasi upsert pada unique key (userId, date) → tidak ada duplikat.
 * Otorisasi dilakukan di action layer (requireRole).
 */

export interface BulkScheduleResult {
  created: number;
  updated: number;
  failed: number;
}

interface ShiftMap {
  pagi: string;
  malam: string;
  off: string;
}

async function getOrfShiftMap(): Promise<ShiftMap> {
  const shifts = await prisma.shift.findMany({
    where: { code: { in: ['ORF_PAGI', 'ORF_MALAM', 'ORF_OFF'] } },
    select: { id: true, code: true },
  });
  const map = new Map(shifts.map((s) => [s.code, s.id]));
  return {
    pagi: map.get('ORF_PAGI') || '',
    malam: map.get('ORF_MALAM') || '',
    off: map.get('ORF_OFF') || '',
  };
}

function eachDate(startDate: string, endDate: string, weekdays?: number[]): string[] {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return dates;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    if (weekdays && weekdays.length > 0 && !weekdays.includes(d.getUTCDay())) continue;
    dates.push(iso);
  }
  return dates;
}

export interface BulkAddParams {
  operatorIds: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  locationId: string;
  mode: 'SINGLE_SHIFT' | 'PATTERN';
  shiftId?: string; // untuk SINGLE_SHIFT
  patternKey?: 'REGULAR' | 'FIELD';
  patternOffset?: number;
  weekdays?: number[]; // 0=Min..6=Sab (kosong = semua hari)
  notes?: string;
  creatorId: string;
}

export async function bulkCreateSchedules(params: BulkAddParams): Promise<BulkScheduleResult> {
  const dates = eachDate(params.startDate, params.endDate, params.weekdays);
  if (dates.length === 0) throw new Error('Rentang tanggal tidak valid.');
  if (params.operatorIds.length === 0) throw new Error('Pilih minimal satu operator.');

  const orfShifts = await getOrfShiftMap();
  const pattern = params.patternKey ? WORK_PATTERNS[params.patternKey] : null;

  let created = 0;
  let updated = 0;

  for (const operatorId of params.operatorIds) {
    const patternShifts = pattern
      ? generatePatternShifts(pattern, dates.length, params.patternOffset || 0)
      : null;

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      let shiftId: string;
      let status: ScheduleStatus;

      if (patternShifts) {
        const shift = patternShifts[i] as PatternShift;
        shiftId = shift === 'PAGI' ? orfShifts.pagi : shift === 'MALAM' ? orfShifts.malam : orfShifts.off;
        status = shift === 'OFF' ? ScheduleStatus.OFF : ScheduleStatus.WORK;
      } else {
        shiftId = params.shiftId!;
        status = ScheduleStatus.WORK;
      }
      if (!shiftId) continue;

      const existing = await prisma.schedule.findUnique({
        where: { userId_date: { userId: operatorId, date } },
        select: { id: true },
      });
      if (existing) {
        await prisma.schedule.update({
          where: { id: existing.id },
          data: { shiftId, locationId: params.locationId, status, notes: params.notes },
        });
        updated += 1;
      } else {
        await prisma.schedule.create({
          data: {
            userId: operatorId,
            date,
            shiftId,
            locationId: params.locationId,
            status,
            notes: params.notes,
          },
        });
        created += 1;
      }
    }
  }

  await recordAuditLog({
    userId: params.creatorId,
    action: 'BULK_CREATE_SCHEDULE',
    entity: 'Schedule',
    metadata: {
      mode: params.mode,
      pattern: params.patternKey || null,
      operators: params.operatorIds.length,
      range: `${params.startDate} s/d ${params.endDate}`,
      created,
      updated,
    },
  });

  return { created, updated, failed: 0 };
}

// ============================================================================
// IMPORT EXCEL — validasi baris + upsert (dua tahap: preview → confirm)
// ============================================================================

export interface ImportRowInput {
  row: number; // nomor baris di Excel
  tanggal: string; // YYYY-MM-DD
  username?: string;
  nama?: string;
  employeeId?: string;
  shift: string; // Pg / Mlm / Off / nama shift
  status?: string; // WORK / OFF (opsional, default ikut shift)
  catatan?: string;
}

export interface ImportRowResult {
  row: number;
  ok: boolean;
  message: string;
  date?: string;
  userName?: string;
  shift?: string;
}

function normalizeShift(raw: string, shiftList: { id: string; code: string; name: string }[]): { shiftId: string; status: ScheduleStatus; label: string } | null {
  const value = (raw || '').trim().toLowerCase();
  if (!value) return null;
  if (['pg', 'pagi', 'p', 'orf_pagi'].includes(value)) {
    const s = shiftList.find((x) => x.code === 'ORF_PAGI');
    return s ? { shiftId: s.id, status: ScheduleStatus.WORK, label: 'Pg' } : null;
  }
  if (['mlm', 'malam', 'm', 'orf_malam'].includes(value)) {
    const s = shiftList.find((x) => x.code === 'ORF_MALAM');
    return s ? { shiftId: s.id, status: ScheduleStatus.WORK, label: 'Mlm' } : null;
  }
  if (['off', 'o', 'libur', 'orf_off'].includes(value)) {
    const s = shiftList.find((x) => x.code === 'ORF_OFF');
    return s ? { shiftId: s.id, status: ScheduleStatus.OFF, label: 'Off' } : null;
  }
  const byName = shiftList.find(
    (x) => x.name.toLowerCase() === value || x.code.toLowerCase() === value
  );
  if (byName) {
    return { shiftId: byName.id, status: ScheduleStatus.WORK, label: byName.name };
  }
  return null;
}

async function resolveUsers(rows: ImportRowInput[]): Promise<Map<string, { id: string; name: string }>> {
  const identifiers = new Set<string>();
  for (const r of rows) {
    if (r.username) identifiers.add(r.username.toLowerCase());
    if (r.employeeId) identifiers.add(r.employeeId.toLowerCase());
  }
  const names = rows
    .filter((r) => !r.username && !r.employeeId && r.nama)
    .map((r) => r.nama!.toLowerCase());

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { in: Array.from(identifiers), mode: 'insensitive' } },
        { employeeId: { in: Array.from(identifiers), mode: 'insensitive' } },
        ...(names.length > 0 ? [{ name: { in: names, mode: 'insensitive' as const } }] : []),
      ],
    },
    select: { id: true, name: true, username: true, employeeId: true, isActive: true },
  });

  const map = new Map<string, { id: string; name: string }>();
  for (const u of users) {
    if (u.username) map.set(`u:${u.username.toLowerCase()}`, { id: u.id, name: u.name });
    if (u.employeeId) map.set(`e:${u.employeeId.toLowerCase()}`, { id: u.id, name: u.name });
    if (u.name) map.set(`n:${u.name.toLowerCase()}`, { id: u.id, name: u.name });
  }
  return map;
}

/** Tahap 1: validasi & preview — TIDAK menulis ke database. */
export async function validateImportRows(rows: ImportRowInput[]): Promise<ImportRowResult[]> {
  const [shiftList, userMap] = await Promise.all([
    prisma.shift.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true } }),
    resolveUsers(rows),
  ]);

  return rows.map((r) => {
    const dateStr = String(r.tanggal || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return { row: r.row, ok: false, message: 'Format tanggal harus YYYY-MM-DD' };
    }
    const user =
      (r.username && userMap.get(`u:${r.username.toLowerCase().trim()}`)) ||
      (r.employeeId && userMap.get(`e:${r.employeeId.toLowerCase().trim()}`)) ||
      (!r.username && !r.employeeId && r.nama ? userMap.get(`n:${r.nama.toLowerCase().trim()}`) : null) ||
      null;
    if (!user) {
      return { row: r.row, ok: false, message: 'User tidak ditemukan (periksa username/nama/employee ID)' };
    }
    const shift = normalizeShift(r.shift, shiftList);
    if (!shift) {
      return { row: r.row, ok: false, message: `Shift tidak dikenal: "${r.shift}" (gunakan Pg / Mlm / Off)` };
    }
    return { row: r.row, ok: true, message: 'OK', date: dateStr, userName: user.name, shift: shift.label };
  });
}

/** Tahap 2: konfirmasi import — upsert semua baris valid. */
export async function confirmImportRows(
  rows: ImportRowInput[],
  creatorId: string
): Promise<{ results: ImportRowResult[]; created: number; updated: number }> {
  const [shiftList, userMap, defaultLocation] = await Promise.all([
    prisma.shift.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true } }),
    resolveUsers(rows),
    prisma.location.findFirst({ where: { code: 'ORF-MKG' }, select: { id: true } }),
  ]);
  const locationId = defaultLocation?.id;
  if (!locationId) throw new Error('Lokasi default ORF Muara Karang tidak ditemukan.');

  const results: ImportRowResult[] = [];
  let created = 0;
  let updated = 0;

  for (const r of rows) {
    const dateStr = String(r.tanggal || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      results.push({ row: r.row, ok: false, message: 'Format tanggal harus YYYY-MM-DD' });
      continue;
    }
    const user =
      (r.username && userMap.get(`u:${r.username.toLowerCase().trim()}`)) ||
      (r.employeeId && userMap.get(`e:${r.employeeId.toLowerCase().trim()}`)) ||
      (!r.username && !r.employeeId && r.nama ? userMap.get(`n:${r.nama.toLowerCase().trim()}`) : null) ||
      null;
    if (!user) {
      results.push({ row: r.row, ok: false, message: 'User tidak ditemukan' });
      continue;
    }
    const shift = normalizeShift(r.shift, shiftList);
    if (!shift) {
      results.push({ row: r.row, ok: false, message: `Shift tidak dikenal: "${r.shift}"` });
      continue;
    }

    const existing = await prisma.schedule.findUnique({
      where: { userId_date: { userId: user.id, date: dateStr } },
      select: { id: true },
    });
    if (existing) {
      await prisma.schedule.update({
        where: { id: existing.id },
        data: { shiftId: shift.shiftId, locationId, status: shift.status, notes: r.catatan || undefined },
      });
      updated += 1;
    } else {
      await prisma.schedule.create({
        data: {
          userId: user.id,
          date: dateStr,
          shiftId: shift.shiftId,
          locationId,
          status: shift.status,
          notes: r.catatan || undefined,
        },
      });
      created += 1;
    }
    results.push({ row: r.row, ok: true, message: 'OK', date: dateStr, userName: user.name, shift: shift.label });
  }

  await recordAuditLog({
    userId: creatorId,
    action: 'IMPORT_SCHEDULES',
    entity: 'Schedule',
    metadata: { totalRows: rows.length, created, updated },
  });

  return { results, created, updated };
}