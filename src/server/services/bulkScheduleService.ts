import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { ImportDocumentType, ImportStatus, ScheduleStatus } from '@prisma/client';
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

  // ATOMIC: seluruh pembuatan massal (mungkin banyak operator x banyak tanggal)
  // ditulis dalam SATU transaction — gagal di tengah → rollback (tidak ada
  // schedule-half-imported + tidak ada duplikat karena unique upsert).
  const { created, updated } = await prisma.$transaction(async (tx) => {
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

        const existing = await tx.schedule.findUnique({
          where: { userId_date: { userId: operatorId, date } },
          select: { id: true },
        });
        if (existing) {
          await tx.schedule.update({
            where: { id: existing.id },
            data: { shiftId, locationId: params.locationId, status, notes: params.notes },
          });
          updated += 1;
        } else {
          await tx.schedule.create({
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

    return { created, updated };
  });

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
  kind?: 'NEW' | 'UPDATED' | 'UNCHANGED' | 'CONFLICT' | 'INVALID';
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
export async function _legacyValidateImportRows(rows: ImportRowInput[]): Promise<ImportRowResult[]> {
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
export async function _legacyConfirmImportRows(
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
// ============================================================================
// IMPORT EXCEL (v2) — klasifikasi per baris: NEW / UPDATED / UNCHANGED /
// CONFLICT / INVALID sebelum data disimpan. Preview dipisahkan dari commit;
// commit mengulang validasi sehingga client tidak bisa melewati preview.
// ============================================================================

type ResolvedImportRow = {
  row: number;
  error?: string;
  user?: { id: string; name: string };
  date?: string;
  shift?: { shiftId: string; status: ScheduleStatus; label: string } | null;
  note?: string;
  statusLabel?: string;
};

function resolveImportRows(
  rows: ImportRowInput[],
  shiftList: { id: string; code: string; name: string }[],
  userMap: Map<string, { id: string; name: string }>
): ResolvedImportRow[] {
  return rows.map((r): ResolvedImportRow => {
    const dateStr = String(r.tanggal || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return { row: r.row, error: 'Format tanggal harus YYYY-MM-DD' };
    }
    const user =
      (r.username && userMap.get(`u:${r.username.toLowerCase().trim()}`)) ||
      (r.employeeId && userMap.get(`e:${r.employeeId.toLowerCase().trim()}`)) ||
      (!r.username && !r.employeeId && r.nama ? userMap.get(`n:${r.nama.toLowerCase().trim()}`) : null) ||
      null;
    if (!user) {
      return { row: r.row, error: 'User tidak ditemukan (periksa username/nama/employee ID)' };
    }
    const requestedStatus = (r.status || '').trim().toUpperCase();
    const shift = normalizeShift(r.shift, shiftList);
    if (!shift) {
      return { row: r.row, error: `Shift tidak dikenal: "${r.shift}" (gunakan Pg / Mlm / Off)` };
    }
    // Kolom Status (WORK/OFF) pada file boleh overriding status default shift
    // (mis. baris "Off" tetap WORK). Validasi agar tidak saling bertentangan.
    let status = shift.status;
    if (requestedStatus === 'WORK' || requestedStatus === 'OFF') {
      status = requestedStatus === 'WORK' ? ScheduleStatus.WORK : ScheduleStatus.OFF;
    }
    return {
      row: r.row,
      user,
      date: dateStr,
      shift: { shiftId: shift.shiftId, status, label: shift.label },
      note: (r.catatan || '').trim() || undefined,
    };
  });
}

/** Tahap 1: validasi & klasifikasi preview — TIDAK menulis ke database. */
export async function validateImportRows(rows: ImportRowInput[]): Promise<ImportRowResult[]> {
  const [shiftList, userMap, existing] = await Promise.all([
    prisma.shift.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true } }),
    resolveUsers(rows),
    prisma.schedule.findMany({
      select: { id: true, userId: true, date: true, shiftId: true, status: true, notes: true },
    }),
  ]);

  const existingByKey = new Map<string, { id: string; shiftId: string; status: ScheduleStatus; notes: string | null }>();
  for (const s of existing) existingByKey.set(`${s.userId}|${s.date}`, s);

  const resolved = resolveImportRows(rows, shiftList, userMap);

  // Duplikat user+tanggal DI DALAM SATU FILE → CONFLICT (roster ganda tak jelas).
  const keyCount = new Map<string, number>();
  for (const item of resolved) {
    if (!item.user || !item.date) continue;
    const key = `${item.user.id}|${item.date}`;
    keyCount.set(key, (keyCount.get(key) || 0) + 1);
  }

  return resolved.map((item): ImportRowResult => {
    if (item.error || !item.user || !item.date || !item.shift) {
      return { row: item.row, ok: false, kind: 'INVALID', message: item.error || 'Baris tidak valid' };
    }
    const key = `${item.user.id}|${item.date}`;
    if ((keyCount.get(key) || 0) > 1) {
      return {
        row: item.row,
        ok: false,
        kind: 'CONFLICT',
        message: 'Roster ganda untuk operator & tanggal yang sama pada file ini — satukan barisnya terlebih dahulu.',
        date: item.date,
        userName: item.user.name,
        shift: item.shift.label,
      };
    }
    const existingRow = existingByKey.get(key);
    if (!existingRow) {
      return { row: item.row, ok: true, kind: 'NEW', message: 'Jadwal baru', date: item.date, userName: item.user.name, shift: item.shift.label };
    }
    const sameShift = existingRow.shiftId === item.shift.shiftId && existingRow.status === item.shift.status;
    const sameNotes = (existingRow.notes || '') === (item.note || '');
    if (sameShift && sameNotes) {
      return { row: item.row, ok: true, kind: 'UNCHANGED', message: 'Tidak ada perubahan', date: item.date, userName: item.user.name, shift: item.shift.label };
    }
    return { row: item.row, ok: true, kind: 'UPDATED', message: 'Akan diperbarui', date: item.date, userName: item.user.name, shift: item.shift.label };
  });
}
/** Tahap 2: konfirmasi import — validasi ulang, lalu tulis hanya NEW/UPDATED. */
export async function confirmImportRows(
  rows: ImportRowInput[],
  creatorId: string
): Promise<{ results: ImportRowResult[]; created: number; updated: number; skippedConflict: number; skippedInvalid: number }> {
  const [shiftList, userMap, defaultLocation, existing] = await Promise.all([
    prisma.shift.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true } }),
    resolveUsers(rows),
    prisma.location.findFirst({ where: { code: 'ORF-MKG' }, select: { id: true } }),
    prisma.schedule.findMany({
      select: { id: true, userId: true, date: true, shiftId: true, status: true, notes: true },
    }),
  ]);
  const locationId = defaultLocation?.id;
  if (!locationId) throw new Error('Lokasi default ORF Muara Karang tidak ditemukan.');

  const existingByKey = new Map<string, { id: string; shiftId: string; status: ScheduleStatus; notes: string | null }>();
  for (const s of existing) existingByKey.set(`${s.userId}|${s.date}`, s);

  const resolved = resolveImportRows(rows, shiftList, userMap);
  const keyCount = new Map<string, number>();
  for (const item of resolved) {
    if (!item.user || !item.date) continue;
    const key = `${item.user.id}|${item.date}`;
    keyCount.set(key, (keyCount.get(key) || 0) + 1);
  }

  // ATOMIC: seluruh baris valid ditulis dalam SATU transaction + historik
  // DataImport + audit — gagal di tengah → rollback (REQUEST tidak pernah
  // berubah tanpa schedule / vice versa).
  return prisma.$transaction(async (tx) => {
    const results: ImportRowResult[] = [];
    let created = 0;
    let updated = 0;
    let skippedConflict = 0;
    let skippedInvalid = 0;

    for (const item of resolved) {
      if (item.error || !item.user || !item.date || !item.shift) {
        skippedInvalid += 1;
        results.push({ row: item.row, ok: false, kind: 'INVALID', message: item.error || 'Baris tidak valid' });
        continue;
      }
      const key = `${item.user.id}|${item.date}`;
      if ((keyCount.get(key) || 0) > 1) {
        skippedConflict += 1;
        results.push({
          row: item.row,
          ok: false,
          kind: 'CONFLICT',
          message: 'Roster ganda untuk operator & tanggal yang sama — dilewati.',
          date: item.date,
          userName: item.user.name,
          shift: item.shift.label,
        });
        continue;
      }
      const existingRow = existingByKey.get(key);
      if (existingRow) {
        const sameShift = existingRow.shiftId === item.shift.shiftId && existingRow.status === item.shift.status;
        const sameNotes = (existingRow.notes || '') === (item.note || '');
        if (sameShift && sameNotes) {
          results.push({ row: item.row, ok: true, kind: 'UNCHANGED', message: 'Tidak ada perubahan', date: item.date, userName: item.user.name, shift: item.shift.label });
          continue;
        }
        await tx.schedule.update({
          where: { id: existingRow.id },
          data: { shiftId: item.shift.shiftId, locationId, status: item.shift.status, notes: item.note || undefined },
        });
        results.push({ row: item.row, ok: true, kind: 'UPDATED', message: 'Diperbarui', date: item.date, userName: item.user.name, shift: item.shift.label });
        updated += 1;
        existingByKey.set(key, { id: existingRow.id, shiftId: item.shift.shiftId, status: item.shift.status, notes: item.note || null });
        continue;
      }
      await tx.schedule.create({
        data: {
          userId: item.user.id,
          date: item.date,
          shiftId: item.shift.shiftId,
          locationId,
          status: item.shift.status,
          notes: item.note || undefined,
        },
      });
      results.push({ row: item.row, ok: true, kind: 'NEW', message: 'Dibuat', date: item.date, userName: item.user.name, shift: item.shift.label });
      created += 1;
    }

    await tx.dataImport.create({
      data: {
        fileName: `import-jadwal-${new Date().toISOString().slice(0, 10)}.xlsx`,
        fileHash: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
        fileSize: 0,
        documentType: ImportDocumentType.JADWAL_KERJA,
        status: ImportStatus.SUCCESS,
        sheetNames: ['Template Jadwal'],
        year: new Date().getFullYear(),
        totalRecords: rows.length,
        createdCount: created,
        updatedCount: updated,
        unchangedCount: results.filter((r) => r.kind === 'UNCHANGED').length,
        conflictCount: skippedConflict,
        rejectedCount: skippedInvalid,
        importedById: creatorId,
      },
    });

    await recordAuditLog({
      userId: creatorId,
      action: 'IMPORT_SCHEDULES',
      entity: 'Schedule',
      metadata: { totalRows: rows.length, created, updated, skippedInvalid, skippedConflict },
    }, tx);

    return { results, created, updated, skippedConflict, skippedInvalid };
  });
}