import { prisma } from '@/lib/db/prisma';
import { ProgramCategory, ProgramStatus, Prisma } from '@prisma/client';
import { recordAuditLog } from './auditService';
import {
  ProgramKerjaCreateInput,
  ProgramKerjaUpdateInput,
} from '@/lib/validation';

// ============================================================================
// Serialisasi untuk Client Component
// ============================================================================

export interface ProgramKerjaMonthDTO {
  month: number;
  week: number;
  target: number;
  realization: number;
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
  months: ProgramKerjaMonthDTO[];
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

function serializeProgram(program: Prisma.ProgramKerjaGetPayload<{ include: { months: true } }>): ProgramKerjaDTO {
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
    months: program.months
      .map((m) => ({ month: m.month, week: m.week, target: m.target, realization: m.realization }))
      .sort((a, b) => a.month - b.month || a.week - b.week),
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
    include: { months: { orderBy: [{ month: 'asc' }, { week: 'asc' }] } },
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
    select: { status: true, months: { select: { month: true, realization: true } } },
  });

  const monthAgg = new Map<number, { plan: number; realisasi: number; tidakTerealisasi: number }>();
  for (let m = 1; m <= 12; m++) monthAgg.set(m, { plan: 0, realisasi: 0, tidakTerealisasi: 0 });

  let realisasiCount = 0;
  let onProgressCount = 0;
  let belumCount = 0;
  let planCount = 0;

  for (const p of programs) {
    if (p.status === ProgramStatus.REALISASI) realisasiCount += 1;
    else if (p.status === ProgramStatus.ON_PROGRESS) onProgressCount += 1;
    else if (p.status === ProgramStatus.BELUM_TEREALISASI) belumCount += 1;
    else if (p.status === ProgramStatus.PLAN) planCount += 1;

    const byMonth = new Map<number, number>();
    for (const m of p.months) {
      byMonth.set(m.month, Math.max(byMonth.get(m.month) ?? 0, m.realization));
    }
    for (const [month, realization] of byMonth) {
      const agg = monthAgg.get(month)!;
      agg.plan += 1;
      if (realization >= 100) agg.realisasi += 1;
      else if (realization <= 0) agg.tidakTerealisasi += 1;
    }
  }

  return {
    year,
    bar: MONTH_SHORT_ID.map((label, i) => ({ month: label, ...(monthAgg.get(i + 1)!) })),
    donut: [
      { name: 'Realisasi', value: realisasiCount, color: '#16A34A' },
      { name: 'On Progress', value: onProgressCount, color: '#F59E0B' },
      { name: 'Tidak Terealisasi', value: belumCount, color: '#DC2626' },
      { name: 'Plan', value: planCount, color: '#94A3B8' },
    ],
  };
}

export async function getProgramKerjaStats(year?: number): Promise<ProgramKerjaStats> {
  const where: Prisma.ProgramKerjaWhereInput = year ? { year } : {};
  const programs = await prisma.programKerja.findMany({
    where,
    select: { status: true, progress: true, category: true },
  });

  const stats: ProgramKerjaStats = {
    total: programs.length,
    plan: 0,
    realisasi: 0,
    onProgress: 0,
    belumTerealisasi: 0,
    avgProgress: 0,
    perCategory: [],
  };

  const categoryCount = new Map<ProgramCategory, number>();
  let progressSum = 0;
  for (const p of programs) {
    switch (p.status) {
      case ProgramStatus.PLAN:
        stats.plan += 1;
        break;
      case ProgramStatus.REALISASI:
        stats.realisasi += 1;
        break;
      case ProgramStatus.ON_PROGRESS:
        stats.onProgress += 1;
        break;
      case ProgramStatus.BELUM_TEREALISASI:
        stats.belumTerealisasi += 1;
        break;
    }
    progressSum += p.progress;
    categoryCount.set(p.category, (categoryCount.get(p.category) || 0) + 1);
  }
  stats.avgProgress = stats.total > 0 ? Math.round(progressSum / stats.total) : 0;
  stats.perCategory = Array.from(categoryCount.entries()).map(([category, total]) => ({ category, total }));
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
      status: input.status as ProgramStatus,
      notes: input.notes ?? null,
    },
  });

  await recordAuditLog({
    userId: actorId,
    action: 'CREATE_PROGRAM_KERJA',
    entity: 'ProgramKerja',
    entityId: program.id,
    metadata: { name: program.name, year: program.year, category: program.category },
  });

  return program;
}

export async function updateProgramKerja(input: ProgramKerjaUpdateInput, actorId: string) {
  const { id, ...data } = input;
  const existing = await prisma.programKerja.findUnique({ where: { id } });
  if (!existing) throw new Error('Program Kerja tidak ditemukan.');

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
      ...(data.progress !== undefined ? { progress: data.progress } : {}),
      ...(data.status !== undefined ? { status: data.status as ProgramStatus } : {}),
      ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
    },
  });

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
