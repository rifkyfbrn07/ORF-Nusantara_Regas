import { prisma } from '@/lib/db/prisma';
import { ProgramCategory, ProgramStatus, ProgramUpdateStatus, Prisma } from '@prisma/client';
import { recordAuditLog } from './auditService';
import {
  ProgramKerjaCreateInput,
  ProgramKerjaUpdateInput,
} from '@/lib/validation';
import { calculateKPI, getProgramCurrentStatus, getProgramStatus } from '@/lib/programKerjaLogic';

// ============================================================================
// Serialisasi untuk Client Component
// ============================================================================

export interface ProgramKerjaMonthDTO {
  month: number;
  week: number;
  /** Nilai Plan (P) pada periode; null = tidak ada data (sel kosong), bukan 0. */
  target: number | null;
  /** Nilai Realisasi (R) pada periode; null = tidak ada data (sel kosong), bukan 0. */
  realization: number | null;
}

export interface ProgramUpdateDTO {
  id: string;
  /** Periode yang dilaporkan (mis. "September 2026"). */
  period: string | null;
  notes: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  driveFileId: string | null;
  driveWebViewLink: string | null;
  storageProvider: string | null;
  storagePath: string | null;
  status: ProgramUpdateStatus;
  submittedBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface ProgramKerjaDTO {
  id: string;
  year: number;
  category: ProgramCategory;
  sequence: number;
  name: string;
  plan: string | null;
  realization: string | null;
  planTarget: number;
  progress: number;
  status: ProgramStatus;
  notes: string | null;
  deadline: string | null;
  evidenceUrl: string | null;
  evidenceName: string | null;
  evidenceMime: string | null;
  evidenceSize: number | null;
  driveFileId: string | null;
  driveWebViewLink: string | null;
  storageProvider: string | null;
  storagePath: string | null;
  evidenceUploadedById: string | null;
  evidenceUploadedAt: string | null;
  pic: { id: string; name: string } | null;
  tasks: { id: string; label: string; isDone: boolean; order: number }[];
  months: ProgramKerjaMonthDTO[];
  progressLogs: {
    id: string;
    oldProgress: number;
    newProgress: number;
    note: string | null;
    evidenceName: string | null;
    driveWebViewLink: string | null;
    userName: string | null;
    createdAt: string;
  }[];
  /** Riwayat Update — setiap pengiriman update/upload adalah record terpisah. */
  updates: ProgramUpdateDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface ProgramKerjaStats {
  total: number;
  plan: number;
  realisasi: number;
  onProgress: number;
  belumTerealisasi: number;
  avgProgress: number;
  perCategory: { category: ProgramCategory; total: number }[];
}

export interface ProgramAnnualChartPoint {
  month: string;
  plan: number;
  realisasi: number;
  tidakTerealisasi: number;
}

export interface ProgramAnnualChartData {
  year: number;
  bar: ProgramAnnualChartPoint[];
  donut: { name: string; value: number; color: string }[];
}

type ProgramKerjaWithRelations = Prisma.ProgramKerjaGetPayload<{
  include: {
    pic: { select: { id: true; name: true } };
    months: true;
    tasks: true;
    progressLogs: { include: { user: { select: { name: true } } }; orderBy: { createdAt: 'desc' } };
    updates: { include: { user: { select: { id: true; name: true } } }; orderBy: { createdAt: 'desc' } };
  };
}>;

export function serializeProgramUpdate(
  update: Prisma.ProgramUpdateGetPayload<{ include: { user: { select: { id: true; name: true } } } }>
): ProgramUpdateDTO {
  return {
    id: update.id,
    period: update.period,
    notes: update.notes,
    fileName: update.fileName,
    mimeType: update.mimeType,
    fileSize: update.fileSize,
    fileUrl: update.fileUrl,
    driveFileId: update.driveFileId,
    driveWebViewLink: update.driveWebViewLink,
    storageProvider: update.storageProvider,
    storagePath: update.storagePath,
    status: update.status,
    submittedBy: update.user ? { id: update.user.id, name: update.user.name } : null,
    createdAt: update.createdAt.toISOString(),
  };
}

function serializeProgram(program: ProgramKerjaWithRelations): ProgramKerjaDTO {
  return {
    id: program.id,
    year: program.year,
    category: program.category,
    sequence: program.sequence,
    name: program.name,
    plan: program.plan,
    realization: program.realization,
    planTarget: program.planTarget,
    progress: program.progress,
    status: program.status,
    notes: program.notes,
    deadline: program.deadline ? program.deadline.toISOString() : null,
    evidenceUrl: program.evidenceUrl,
    evidenceName: program.evidenceName,
    evidenceMime: program.evidenceMime,
    evidenceSize: program.evidenceSize,
    driveFileId: program.driveFileId,
    driveWebViewLink: program.driveWebViewLink,
    storageProvider: program.storageProvider,
    storagePath: program.storagePath,
    evidenceUploadedById: program.evidenceUploadedById,
    evidenceUploadedAt: program.evidenceUploadedAt ? program.evidenceUploadedAt.toISOString() : null,
    pic: program.pic,
    tasks: program.tasks.map((t) => ({ id: t.id, label: t.label, isDone: t.isDone, order: t.order })),
    months: program.months
      .map((m) => ({ month: m.month, week: m.week, target: m.target, realization: m.realization }))
      .sort((a, b) => a.month - b.month || a.week - b.week),
    progressLogs: program.progressLogs
      ? program.progressLogs.map((log) => ({
          id: log.id,
          oldProgress: log.oldProgress,
          newProgress: log.newProgress,
          note: log.note,
          evidenceName: log.evidenceName,
          driveWebViewLink: log.driveWebViewLink,
          userName: log.user?.name ?? null,
          createdAt: log.createdAt.toISOString(),
        }))
      : [],
    updates: program.updates ? program.updates.map(serializeProgramUpdate) : [],
    createdAt: program.createdAt.toISOString(),
    updatedAt: program.updatedAt.toISOString(),
  };
}

// ============================================================================
// Queries
// ============================================================================

export async function listProgramKerja(filters?: {
  year?: number;
  category?: ProgramCategory;
  status?: ProgramStatus;
}): Promise<ProgramKerjaDTO[]> {
  const where: Prisma.ProgramKerjaWhereInput = {};
  if (filters?.year) where.year = filters.year;
  if (filters?.category) where.category = filters.category;
  if (filters?.status) where.status = filters.status;

  const programs = await prisma.programKerja.findMany({
    where,
    include: {
      pic: { select: { id: true, name: true } },
      months: { orderBy: [{ month: 'asc' }, { week: 'asc' }] },
      tasks: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      progressLogs: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      updates: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
    },
    orderBy: [{ year: 'desc' }, { category: 'asc' }, { sequence: 'asc' }],
  });
  return programs.map(serializeProgram);
}

export async function getProgramKerjaYears(): Promise<number[]> {
  const rows = await prisma.programKerja.findMany({
    select: { year: true },
    distinct: ['year'],
    orderBy: { year: 'desc' },
  });
  return rows.map((r) => r.year);
}

const MONTH_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Data grafik tahunan Program Kerja:
 * - Bar: per bulan → jumlah program berjadwal (Plan) vs terealisasi (R=100) vs tidak terealisasi (R=0).
 * - Donut: distribusi status program.
 */
export async function getProgramKerjaAnnualChart(year: number): Promise<ProgramAnnualChartData> {
  const programs = await prisma.programKerja.findMany({
    where: { year },
    select: { progress: true, months: { select: { month: true, target: true, realization: true } } },
  });

  const monthAgg = new Map<number, { plan: number; realisasi: number; tidakTerealisasi: number }>();
  for (let m = 1; m <= 12; m++) monthAgg.set(m, { plan: 0, realisasi: 0, tidakTerealisasi: 0 });

  // Bar — distribusi Plan vs Realisasi per bulan (berbasis data periode per bulan).
  for (const p of programs) {
    for (let m = 1; m <= 12; m++) {
      const mEntries = p.months.filter((x) => x.month === m);
      const hasPlan = mEntries.some((x) => x.target !== null);
      const realVals = mEntries.filter((x) => x.realization !== null).map((x) => x.realization!);

      const agg = monthAgg.get(m)!;
      if (hasPlan) {
        agg.plan += 1;
      }
      if (realVals.length > 0) {
        const maxVal = Math.max(...realVals);
        if (maxVal >= 100) {
          agg.realisasi += 1;
        } else if (maxVal <= 0 && realVals.every((v) => v === 0)) {
          agg.tidakTerealisasi += 1;
        }
      }
    }
  }

  // Donut — distribusi status program konsisten dengan resolver canonical
  // `getProgramStatus` (berbasis progress, sesuai Rule 2 & 10).
  const statusDist = { PLAN: 0, ON_PROGRESS: 0, REALISASI: 0 } as Record<ProgramStatus, number>;
  for (const p of programs) {
    statusDist[getProgramStatus({ progress: p.progress })] += 1;
  }

  return {
    year,
    bar: MONTH_SHORT_ID.map((label, i) => ({ month: label, ...(monthAgg.get(i + 1)!) })),
    donut: [
      { name: 'PLAN', value: statusDist.PLAN, color: '#0066B3' },
      { name: 'ON PROGRESS', value: statusDist.ON_PROGRESS, color: '#F59E0B' },
      { name: 'REALISASI', value: statusDist.REALISASI, color: '#16A34A' },
    ],
  };
}

export async function getProgramKerjaStats(year?: number): Promise<ProgramKerjaStats> {
  const where: Prisma.ProgramKerjaWhereInput = year ? { year } : {};
  const programs = await prisma.programKerja.findMany({
    where,
    select: { status: true, progress: true, category: true, months: { select: { target: true } } },
  });

  // Perhitungan KPI memakai layer kalkulasi yang SAMA dengan halaman
  // Program Kerja (single source of truth) — status dari progress.
  const kpi = calculateKPI(programs);

  const categoryCount = new Map<ProgramCategory, number>();
  for (const p of programs) {
    categoryCount.set(p.category, (categoryCount.get(p.category) || 0) + 1);
  }

  const stats: ProgramKerjaStats = {
    total: kpi.total,
    plan: kpi.plan,
    realisasi: kpi.realisasi,
    onProgress: kpi.onProgress,
    belumTerealisasi: kpi.belumTerealisasi,
    avgProgress: kpi.avgProgress,
    perCategory: Array.from(categoryCount.entries()).map(([category, total]) => ({ category, total })),
  };
  return stats;
}

// ============================================================================
// Mutations (dipanggil via Server Actions — otorisasi dilakukan di action layer)
// ============================================================================

export async function createProgramKerja(input: ProgramKerjaCreateInput, actorId: string) {
  const existing = await prisma.programKerja.findUnique({
    where: {
      year_category_name: {
        year: input.year,
        category: input.category as ProgramCategory,
        name: input.name,
      },
    },
  });
  if (existing) {
    throw new Error('Program dengan nama, kategori, dan tahun tersebut sudah ada.');
  }

  const program = await prisma.programKerja.create({
    data: {
      year: input.year,
      category: input.category as ProgramCategory,
      sequence: input.sequence,
      name: input.name,
      plan: input.plan ?? null,
      realization: input.realization ?? null,
      planTarget: input.planTarget,
      progress: input.progress,
      // Status OTOMATIS dari progress: 0 → PLAN, 0<x<100 → ON PROGRESS, 100 → REALISASI (TEREALISASI).
      status: getProgramCurrentStatus({ progress: input.progress, status: input.status as ProgramStatus }),
      notes: input.notes ?? null,
      deadline: input.deadline ? new Date(`${input.deadline}T00:00:00+07:00`) : null,
      picId: input.picId ?? null,
      evidenceUrl: input.evidenceUrl ?? null,
      evidenceName: input.evidenceName ?? null,
      evidenceMime: input.evidenceMime ?? null,
      evidenceSize: input.evidenceSize ?? null,
      driveFileId: input.driveFileId ?? null,
      driveWebViewLink: input.driveWebViewLink ?? null,
      storageProvider: input.storageProvider ?? null,
      storagePath: input.storagePath ?? null,
      ...(input.driveFileId || input.storagePath ? { evidenceUploadedAt: new Date(), evidenceUploadedById: actorId } : {}),
    },
  });

  // If progress/evidence provided on creation, log it for history
  if (input.progress > 0) {
    await prisma.programKerjaProgressLog.create({
      data: {
        programId: program.id,
        oldProgress: 0,
        newProgress: input.progress,
        note: input.notes,
        evidenceUrl: input.evidenceUrl ?? null,
        evidenceName: input.evidenceName ?? null,
        evidenceMime: input.evidenceMime ?? null,
        evidenceSize: input.evidenceSize ?? null,
        driveFileId: input.driveFileId ?? null,
        driveWebViewLink: input.driveWebViewLink ?? null,
        storageProvider: input.storageProvider ?? null,
        storagePath: input.storagePath ?? null,
        userId: actorId,
      },
    });
  }

  await recordAuditLog({
    userId: actorId,
    action: 'CREATE_PROGRAM_KERJA',
    entity: 'ProgramKerja',
    entityId: program.id,
    metadata: { name: program.name, year: program.year, category: program.category, progress: program.progress },
  });

  return program;
}

export async function updateProgramKerja(input: ProgramKerjaUpdateInput, actorId: string) {
  const { id, ...data } = input;
  const existing = await prisma.programKerja.findUnique({ where: { id } });
  if (!existing) throw new Error('Program Kerja tidak ditemukan.');

  // Progress baru + Status OTOMATIS (0 → PLAN, 0<x<100 → ON PROGRESS, 100 → TEREALISASI).
  // Field `progress` menjadi otoritas utama; field `status` yang dikirim user
  // diabaikan kecuali untuk menentukan PLAN vs TIDAK TEREALISASI saat progress 0.
  const progressValue = data.progress !== undefined ? Math.min(100, Math.max(0, Math.round(data.progress))) : existing.progress;
  const statusValue = getProgramCurrentStatus({
    progress: progressValue,
    status: data.status !== undefined ? (data.status as ProgramStatus) : existing.status,
  });

  const program = await prisma.programKerja.update({
    where: { id },
    data: {
      ...(data.year !== undefined ? { year: data.year } : {}),
      ...(data.category !== undefined ? { category: data.category as ProgramCategory } : {}),
      ...(data.sequence !== undefined ? { sequence: data.sequence } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.plan !== undefined ? { plan: data.plan ?? null } : {}),
      ...(data.realization !== undefined ? { realization: data.realization ?? null } : {}),
      ...(data.planTarget !== undefined ? { planTarget: data.planTarget } : {}),
      ...(data.progress !== undefined ? { progress: progressValue } : {}),
      status: statusValue,
      ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
      ...(data.deadline !== undefined ? { deadline: data.deadline ? new Date(`${data.deadline}T00:00:00+07:00`) : null } : {}),
      ...(data.picId !== undefined ? { picId: data.picId ?? null } : {}),
      ...(data.evidenceUrl !== undefined ? { evidenceUrl: data.evidenceUrl ?? null } : {}),
      ...(data.evidenceName !== undefined ? { evidenceName: data.evidenceName ?? null } : {}),
      ...(data.evidenceMime !== undefined ? { evidenceMime: data.evidenceMime ?? null } : {}),
      ...(data.evidenceSize !== undefined ? { evidenceSize: data.evidenceSize ?? null } : {}),
      ...(data.driveFileId !== undefined ? { driveFileId: data.driveFileId ?? null } : {}),
      ...(data.driveWebViewLink !== undefined ? { driveWebViewLink: data.driveWebViewLink ?? null } : {}),
      ...(data.storageProvider !== undefined ? { storageProvider: data.storageProvider ?? null } : {}),
      ...(data.storagePath !== undefined ? { storagePath: data.storagePath ?? null } : {}),
      ...(data.driveFileId || data.storagePath ? { evidenceUploadedAt: new Date(), evidenceUploadedById: actorId } : {}),
    },
  });

  // Log progress change history (without overwriting target values)
  const hasProgressChange = data.progress !== undefined && data.progress !== existing.progress;
  const hasNewEvidence = Boolean(data.driveFileId || data.evidenceUrl);
  if (hasProgressChange || hasNewEvidence) {
    await prisma.programKerjaProgressLog.create({
      data: {
        programId: program.id,
        oldProgress: existing.progress,
        newProgress: data.progress !== undefined ? data.progress : existing.progress,
        note: data.notes,
        evidenceUrl: data.evidenceUrl ?? null,
        evidenceName: data.evidenceName ?? null,
        evidenceMime: data.evidenceMime ?? null,
        evidenceSize: data.evidenceSize ?? null,
        driveFileId: data.driveFileId ?? null,
        driveWebViewLink: data.driveWebViewLink ?? null,
        storageProvider: data.storageProvider ?? null,
        storagePath: data.storagePath ?? null,
        userId: actorId,
      },
    });
  }

  await recordAuditLog({
    userId: actorId,
    action: 'UPDATE_PROGRAM_KERJA',
    entity: 'ProgramKerja',
    entityId: program.id,
    metadata: { name: program.name, progress: program.progress, status: program.status },
  });

  return program;
}

export async function deleteProgramKerja(id: string, actorId: string) {
  const existing = await prisma.programKerja.findUnique({ where: { id } });
  if (!existing) throw new Error('Program Kerja tidak ditemukan.');

  await prisma.programKerja.delete({ where: { id } });

  await recordAuditLog({
    userId: actorId,
    action: 'DELETE_PROGRAM_KERJA',
    entity: 'ProgramKerja',
    entityId: id,
    metadata: { name: existing.name, year: existing.year, category: existing.category },
  });

  return { success: true };
}

// ============================================================================
// CHECKLIST TASK — operator update progress; progress dapat dihitung dari task
// ============================================================================

/** Toggle status task (PIC/operator yang ditugaskan, atau MGR/ADMIN). */
export async function upsertProgramKerjaTask(params: {
  programId: string;
  label: string;
  isDone: boolean;
  actorId: string;
  actorRole: string;
}) {
  const program = await prisma.programKerja.findUnique({
    where: { id: params.programId },
    include: { tasks: { orderBy: { order: 'asc' } } },
  });
  if (!program) throw new Error('Program Kerja tidak ditemukan.');

  // Otorisasi: MANAGER atau ADMIN (operator view-only — PIC tidak lagi dipakai)
  const canAssign = params.actorRole === 'ADMIN' || params.actorRole === 'MANAGER';
  if (!canAssign) throw new Error('Anda tidak berwenang memperbarui checklist program ini.');

  const task = await prisma.programKerjaTask.create({
    data: {
      programId: params.programId,
      label: params.label,
      isDone: params.isDone,
      doneById: params.isDone ? params.actorId : null,
      order: program.tasks.length,
    },
  });

  await recomputeTaskProgress(params.programId);
  return task;
}

export async function setTaskDone(params: { taskId: string; isDone: boolean; actorId: string; actorRole: string }) {
  const task = await prisma.programKerjaTask.findUnique({
    where: { id: params.taskId },
    select: { id: true, programId: true },
  });
  if (!task) throw new Error('Task tidak ditemukan.');
  const can = params.actorRole === 'ADMIN' || params.actorRole === 'MANAGER';
  if (!can) throw new Error('Anda tidak berwenang memperbarui checklist program ini.');

  await prisma.programKerjaTask.update({
    where: { id: params.taskId },
    data: { isDone: params.isDone, doneById: params.isDone ? params.actorId : null, doneAt: params.isDone ? new Date() : null },
  });
  await recomputeTaskProgress(task.programId);
  return { success: true };
}

/** Recompute progress berdasarkan task completed + update progress */
async function recomputeTaskProgress(programId: string) {
  const tasks = await prisma.programKerjaTask.findMany({ where: { programId }, select: { isDone: true } });
  const doneCount = tasks.filter((t) => t.isDone).length;
  const progress = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);
  await prisma.programKerja.update({ where: { id: programId }, data: { progress } });
  return { doneCount, total: tasks.length, progress };
}

/** Update progress (0..100) — Manager/Admin (operator view-only) */
export async function updateProgramProgress(
  programId: string,
  progress: number,
  actorId: string,
  actorRole: string,
  evidence?: { evidenceUrl?: string; evidenceName?: string; evidenceMime?: string; evidenceSize?: number; driveFileId?: string; driveWebViewLink?: string; storageProvider?: string; storagePath?: string; note?: string }
) {
  const program = await prisma.programKerja.findUnique({ where: { id: programId }, select: { id: true, progress: true, status: true } });
  if (!program) throw new Error('Program Kerja tidak ditemukan.');
  const can = actorRole === 'ADMIN' || actorRole === 'MANAGER';
  if (!can) throw new Error('Anda tidak berwenang memperbarui progress program ini.');
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));
  // Status OTOMATIS dari progress terbaru (100% → TEREALISASI, dst.).
  const autoStatus = getProgramCurrentStatus({ progress: clamped, status: program.status });

  // Evidence wajib saat progress meningkat (bukti/evidence)
  if (clamped > program.progress) {
    const hasEvidence = Boolean(evidence?.evidenceUrl || evidence?.driveWebViewLink || evidence?.driveFileId || evidence?.storagePath);
    if (!hasEvidence) {
      throw new Error('Bukti/evidence wajib dilampirkan untuk memperbarui progress program.');
    }
  }

  // Log + update program dalam satu transaction — upload gagal tidak boleh
  // meninggalkan record progress/evidence rusak (rollback atomic).
  await prisma.$transaction([
    prisma.programKerjaProgressLog.create({
      data: {
        programId,
        oldProgress: program.progress,
        newProgress: clamped,
        note: evidence?.note,
        evidenceUrl: evidence?.evidenceUrl ?? null,
        evidenceName: evidence?.evidenceName ?? null,
        evidenceMime: evidence?.evidenceMime ?? null,
        evidenceSize: evidence?.evidenceSize ?? null,
        driveFileId: evidence?.driveFileId ?? null,
        driveWebViewLink: evidence?.driveWebViewLink ?? null,
        storageProvider: evidence?.storageProvider ?? null,
        storagePath: evidence?.storagePath ?? null,
        userId: actorId,
      },
    }),
    prisma.programKerja.update({
      where: { id: programId },
      data: {
        progress: clamped,
        status: autoStatus,
        ...(evidence?.evidenceUrl ? { evidenceUrl: evidence.evidenceUrl } : {}),
        ...(evidence?.evidenceName ? { evidenceName: evidence.evidenceName } : {}),
        ...(evidence?.evidenceMime ? { evidenceMime: evidence.evidenceMime } : {}),
        ...(evidence?.evidenceSize ? { evidenceSize: evidence.evidenceSize } : {}),
        ...(evidence?.driveFileId ? { driveFileId: evidence.driveFileId } : {}),
        ...(evidence?.driveWebViewLink ? { driveWebViewLink: evidence.driveWebViewLink } : {}),
        ...(evidence?.storageProvider ? { storageProvider: evidence.storageProvider } : {}),
        ...(evidence?.storagePath ? { storagePath: evidence.storagePath } : {}),
        ...(evidence?.driveFileId || evidence?.storagePath ? { evidenceUploadedAt: new Date(), evidenceUploadedById: actorId } : {}),
        updatedAt: new Date(),
      },
    }),
  ]);

  await recordAuditLog({
    userId: actorId,
    action: 'UPDATE_PROGRAM_KERJA_PROGRESS',
    entity: 'ProgramKerja',
    entityId: programId,
    metadata: { oldProgress: program.progress, newProgress: clamped, hasEvidence: Boolean(evidence?.driveFileId || evidence?.evidenceUrl) },
  });

  return { success: true, progress: clamped };
}
// ============================================================================
// RIWAYAT UPDATE (ProgramUpdate)
// ============================================================================

/**
 * Kirim update program (append-only). Membuat record Riwayat Update baru —
 * tidak pernah menimpa update yang sudah ada dan TIDAK mengubah Plan/Realisasi,
 * progress, status, maupun bulan program (Rule 9: jangan merusak fitur existing).
 */
export async function submitProgramUpdate(
  input: {
    programId: string;
    period?: string | null;
    notes?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
    storageProvider?: string | null;
    storagePath?: string | null;
    driveFileId?: string | null;
    driveWebViewLink?: string | null;
    fileUrl?: string | null;
  },
  actorId: string
): Promise<ProgramUpdateDTO> {
  const program = await prisma.programKerja.findUnique({
    where: { id: input.programId },
    select: { id: true },
  });
  if (!program) throw new Error('Program tidak ditemukan.');

  const update = await prisma.programUpdate.create({
    data: {
      programId: input.programId,
      userId: actorId,
      period: input.period ?? null,
      notes: input.notes ?? null,
      fileName: input.fileName ?? null,
      mimeType: input.mimeType ?? null,
      fileSize: input.fileSize ?? null,
      storageProvider: input.storageProvider ?? null,
      storagePath: input.storagePath ?? null,
      driveFileId: input.driveFileId ?? null,
      driveWebViewLink: input.driveWebViewLink ?? null,
      fileUrl: input.fileUrl ?? null,
      status: 'TERKIRIM',
    },
    include: { user: { select: { id: true, name: true } } },
  });

  await recordAuditLog({
    userId: actorId,
    action: 'CREATE_PROGRAM_UPDATE',
    entity: 'ProgramUpdate',
    entityId: update.id,
    metadata: {
      programId: input.programId,
      period: input.period,
      fileName: input.fileName,
      storageProvider: input.storageProvider,
    },
  });

  return serializeProgramUpdate(update);
}
