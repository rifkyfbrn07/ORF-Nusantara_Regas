import { ProgramStatus } from '@prisma/client';

// ============================================================================
// CENTRALIZED CALCULATION LAYER — Program Kerja
// ----------------------------------------------------------------------------
// Single source of truth untuk:
//   - status program (computedStatus dari progress, bukan field status db)
//   - KPI (Total, Plan, Realisasi, ON PROGRESS, Belum Terealisasi, Progress)
//   - Ringkasan Status / Donut
//   - Distribusi Program Kerja per Bulan (bar chart)
//
// Semua komponen (KPI, chart, donut, tabel, timeline, filter) WAJIB membaca
// dataset yang sudah dinormalisasi lewat normalizePrograms() + fungsi di file
// ini. JANGAN membuat perhitungan status yang berbeda di komponen lain.
// ============================================================================

export type ComputedProgramStatus =
  | 'PLAN'
  | 'ON_PROGRESS'
  | 'REALISASI'
  | 'BELUM_TEREALISASI';

export interface ProgramKerjaMonthLike {
  month?: number;
  week?: number;
  target?: number | null;
  realization?: number | null;
}

export interface ProgramKerjaLike {
  progress: number;
  months?: ProgramKerjaMonthLike[];
  status?: ProgramStatus;
}

export const PROGRAM_MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

// ----------------------------------------------------------------------------
// STATUS RESOLVER (Rule 2 & 13)
// ----------------------------------------------------------------------------
// Status ditentukan dari PROGRESS (bukan field status database) + jatuh tempo:
//   progress >= 100              => REALISASI (label UI: TEREALISASI)
//   0 < progress < 100           => ON PROGRESS
//   progress === 0 & sudah due   => BELUM_TEREALISASI (label UI: TIDAK TEREALISASI)
//   progress === 0 & belum due   => PLAN
//
// Program dengan progress 100% TIDAK boleh tampil sebagai ON PROGRESS.
// Progress 0 yang periode-nya belum jatuh tempo TETAP PLAN (bukan TIDAK TEREALISASI).
export function getProgramStatus(p: { progress: number; overdue?: boolean | number }): ComputedProgramStatus {
  const progress = Number(p.progress) || 0;
  if (progress >= 100) return ProgramStatus.REALISASI;
  if (progress > 0) return ProgramStatus.ON_PROGRESS;
  if (p.overdue) return ProgramStatus.BELUM_TEREALISASI;
  return ProgramStatus.PLAN;
}

/** KPI "Belum Terealisasi": progress < 100 (konsisten dengan definisi status). */
export function isBelumTerealisasi(p: { progress: number }): boolean {
  return (Number(p.progress) || 0) < 100;
}

/**
 * Apakah program memiliki basis Plan (perencanaan) — ada target pada periode
 * manapun. Program yang sudah direalisasikan TETAP memiliki Plan (Rule 1 & 5):
 * Plan tidak pernah dihapus ketika realisasi terjadi.
 */
export function hasPlanBasis(p: { months?: ProgramKerjaMonthLike[] }): boolean {
  return Boolean(p.months?.some((m) => m.target !== null));
}

/** Apakah program memiliki aktivitas (Plan atau Realisasi) pada bulan tertentu. */
export function isActiveInMonth(p: { months?: ProgramKerjaMonthLike[] }, month: number): boolean {
  return Boolean(
    p.months?.some((m) => m.month === month && (m.target !== null || m.realization !== null))
  );
}

// ----------------------------------------------------------------------------
// NORMALIZATION (Rule 3 & 4)
// ----------------------------------------------------------------------------
export type NormalizedProgram<T> = T & { computedStatus: ComputedProgramStatus };

export function normalizeProgram<T extends { progress: number }>(program: T): NormalizedProgram<T> {
  return { ...program, computedStatus: getProgramStatus(program) };
}

export function normalizePrograms<T extends { progress: number }>(programs: T[]): NormalizedProgram<T>[] {
  return programs.map(normalizeProgram);
}

// ----------------------------------------------------------------------------
// KPI (Rule 4, 5, 6, 8, 9)
// ----------------------------------------------------------------------------
export interface ProgramKPI {
  /** Jumlah PROGRAM UNIK (tidak ada double counting plan/realisasi). */
  total: number;
  /** Jumlah program dengan basis Plan (perencanaan) — tidak pernah berkurang saat realisasi. */
  plan: number;
  /** Jumlah program dengan progress >= 100 (REALISASI / TEREALISASI). */
  realisasi: number;
  /** 0 < progress < 100. */
  onProgress: number;
  /** progress < 100. */
  belumTerealisasi: number;
  /** Rata-rata progress aktual program (bukan perhitungan asal dari jumlah status). */
  avgProgress: number;
}

export function calculateKPI(programs: ProgramKerjaLike[]): ProgramKPI {
  const total = programs.length;
  const plan = programs.filter(hasPlanBasis).length;
  const realisasi = programs.filter((p) => (Number(p.progress) || 0) >= 100).length;
  const onProgress = programs.filter((p) => {
    const progress = Number(p.progress) || 0;
    return progress > 0 && progress < 100;
  }).length;
  const belumTerealisasi = programs.filter(isBelumTerealisasi).length;
  const avgProgress = total
    ? Math.round(programs.reduce((sum, p) => sum + (Number(p.progress) || 0), 0) / total)
    : 0;
  return { total, plan, realisasi, onProgress, belumTerealisasi, avgProgress };
}

// ----------------------------------------------------------------------------
// RINGKASAN STATUS / DONUT (Rule 10)
// ----------------------------------------------------------------------------
export interface StatusSummary {
  PLAN: number;
  ON_PROGRESS: number;
  REALISASI: number;
  BELUM_TEREALISASI: number;
}

/**
 * Setiap program dihitung SATU KALI berdasarkan computedStatus
 * (resolver yang sama dengan tabel). Total kategori = jumlah program.
 */
export function calculateStatusSummary(programs: ProgramKerjaLike[]): StatusSummary {
  const summary: StatusSummary = { PLAN: 0, ON_PROGRESS: 0, REALISASI: 0, BELUM_TEREALISASI: 0 };
  for (const program of programs) {
    summary[getProgramStatus(program)] += 1;
  }
  return summary;
}

// ----------------------------------------------------------------------------
// DISTRIBUSI PROGRAM KERJA PER BULAN (Rule 11)
// ----------------------------------------------------------------------------
export interface MonthlyDistributionPoint {
  month: string;
  m: number;
  PLAN: number;
  ON_PROGRESS: number;
  REALISASI: number;
  [key: string]: number | string;
}

/**
 * Untuk setiap bulan: program yang aktif (ada Plan/Realisasi) pada bulan tsb
 * dihitung 1x dan dikelompokkan berdasarkan computedStatus (status yang sama
 * dengan KPI & donut). Bulan tanpa data bernilai 0 — tidak ada angka dummy.
 */
export function calculateMonthlyDistribution(
  programs: ProgramKerjaLike[],
  months: number[]
): MonthlyDistributionPoint[] {
  return months.map((m) => {
    const point: MonthlyDistributionPoint = {
      month: PROGRAM_MONTH_SHORT[m - 1],
      m,
      PLAN: 0,
      ON_PROGRESS: 0,
      REALISASI: 0,
    };
    for (const program of programs) {
      if (!isActiveInMonth(program, m)) continue;
      point[getProgramStatus(program)] += 1;
    }
    return point;
  });
}
// ============================================================================
// NORMALIZED METRICS — SINGLE SOURCE OF TRUTH HALAMAN PROGRAM KERJA
// ----------------------------------------------------------------------------
// Model data (P = Plan, R = Realisasi adalah PASANGAN untuk SATU program):
//   - Plan  = BASELINE dalam scope: SATU Program = SATU Plan.
//     Program yang sudah terealisasi TETAP punya Plan (Plan tidak pernah
//     berkurang / dihapus karena realisasi).
//   - Realisasi = SATU Program dihitung terealisasi PENUH (progress >= 100%).
//   - Tidak Terealisasi = max(Plan - Realisasi, 0).
//   - Progress per program (0..100) dihitung dari unit periode Plan
//     (untuk status/donut yang akurat), Progress agregat = Realisasi/Plan*100.
//
// Seluruh KPI, filter, tabel, bar chart, dan donut halaman Program Kerja WAJIB
// memakai fungsi-fungsi di bawah ini — tidak boleh ada perhitungan mandiri di
// komponen lain (single source of truth).
// ============================================================================

/** Program apa pun yang memiliki `months` (+ opsional `year`/`deadline`). */
export type ProgramMetricsLike = {
  months?: ProgramKerjaMonthLike[];
  year?: number;
  deadline?: Date | string | null;
};

export interface ProgramMetrics {
  /** Boolean 1/0 — program punya Plan (baseline) dalam scope. 0 = tanpa Plan. */
  plan: number;
  /** 1/0 — program sudah terealisasi PENUH (progress >= 100%) dalam scope. */
  realization: number;
  /** Tidak Terealisasi = max(plan - realization, 0). Tidak pernah negatif. */
  notRealized: number;
  /** Progress per program (0..100) dari unit periode Plan dalam scope. */
  progress: number;
  /** Program. Plan jatuh tempo (deadline/bulan target lewat) padahal progress 0. */
  overdue: boolean;
  /**
   * Status turunan (mutually exclusive — SATU program = SATU status):
   *   progress >= 100        → REALISASI (label: TEREALISASI)
   *   0 < progress < 100     → ON PROGRESS
   *   progress = 0 & overdue → BELUM_TEREALISASI (label: TIDAK TEREALISASI)
   *   progress = 0 & belum   → PLAN
   */
  status: ComputedProgramStatus;
}

export const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * Apakah Plan program sudah JATUH TEMPO padahal progress 0 (untuk kategori
 * TIDAK TEREALISASI). Menggunakan field `deadline` existing jika ada; bila
 * tidak, memakai bulan terakhir yang direncanakan (target period) di scope:
 * - scope bulan tertentu (PER BULAN) → bulan terakhir dalam scope itu.
 * - scope tahunan → seluruh bulan Januari–Desember pada `year` program.
 * Bulan target yang MASIH di depan / berjalan → belum jatuh tempo (PLAN).
 */
export function isProgramOverdue(
  p: ProgramMetricsLike,
  months?: number[],
  now: Date = new Date()
): boolean {
  if (p.deadline) {
    const d = p.deadline instanceof Date ? p.deadline : new Date(p.deadline);
    if (!Number.isNaN(d.getTime()) && d < now) return true;
  }

  const scope = months && months.length > 0 ? new Set(months) : null;
  let maxPlannedMonth = 0;
  for (const m of p.months ?? []) {
    if (m.target === null || m.target === undefined) continue;
    if (scope && !scope.has(m.month ?? -1)) continue;
    if ((m.month ?? 0) > maxPlannedMonth) maxPlannedMonth = m.month ?? 0;
  }
  if (maxPlannedMonth === 0) return false;

  const year = p.year ?? now.getFullYear();
  const dueYearMonth = year * 12 + maxPlannedMonth; // posisi bulan 1-based
  const currentYearMonth = now.getFullYear() * 12 + (now.getMonth() + 1);
  return dueYearMonth < currentYearMonth;
}

/**
 * Hitung metrik Plan/Realisasi sebuah program pada `months` (null/undefined =
 * seluruh Januari–Desember).
 *
 * - `plan` = 1 bila program memiliki target Plan dalam scope (baseline; tidak
 *   pernah hilang meskipun sudah 100% terealisasi).
 * - `progress` dihitung dari unit periode (akurat untuk status & donut).
 * - `realization` = 1 hanya jika progress scope >= 100%.
 * - `notRealized` = max(plan - realization, 0).
 */
export function getProgramMetrics(
  p: ProgramMetricsLike,
  months?: number[],
  now: Date = new Date()
): ProgramMetrics {
  const scope = months && months.length > 0 ? new Set(months) : null;
  let planUnits = 0;
  let realizedUnits = 0;

  for (const m of p.months ?? []) {
    if (m.month === undefined) continue;
    if (scope && !scope.has(m.month)) continue;
    // Plan dihitung dari keberadaan target (sel biru/jadwal), BUKAN dari nilai 100.
    if (m.target === null || m.target === undefined) continue;

    planUnits += 1;
    if (m.realization !== null && m.realization !== undefined) {
      // Nilai R dalam persen (0..100). 100 → 1 unit, 50 → 0.5 unit, 0 → 0 unit.
      realizedUnits += Math.min(1, Math.max(0, m.realization / 100));
    }
  }

  const progress = planUnits > 0 ? Math.min(100, (realizedUnits / planUnits) * 100) : 0;
  const plan = planUnits > 0 ? 1 : 0;
  const realization = plan > 0 && progress >= 100 ? 1 : 0;
  const notRealized = Math.max(plan - realization, 0);
  const overdue = isProgramOverdue(p, months, now);

  return {
    plan,
    realization,
    notRealized,
    progress,
    overdue,
    status: getProgramStatus({ progress, overdue }),
  };
}
export interface ProgramAggregateMetrics {
  /** Jumlah program unik dalam dataset (P/R tidak pernah dihitung terpisah). */
  total: number;
  /** Total Plan (baseline) = jumlah program yang punya Plan dalam scope. */
  plan: number;
  /** Total program yang sudah terealisasi PENUH (progress >= 100%) dalam scope. */
  realization: number;
  /** Tidak Terealisasi = max(plan - realization, 0). Tidak pernah negatif. */
  notRealized: number;
  /** Progress agregat = total Realisasi / total Plan × 100 (bukan rata-rata %). */
  progress: number;
  /** Distribusi STATUS program — mutually exclusive, total = total program. */
  statusSummary: Record<ComputedProgramStatus, number>;
}

/** Agregasi lintas program untuk KPI, bar chart, dan donut (dataset yang sama). */
export function getAggregateProgramMetrics(
  programs: ProgramMetricsLike[],
  months?: number[],
  now: Date = new Date()
): ProgramAggregateMetrics {
  let total = 0;
  let plan = 0;
  let realization = 0;
  const statusSummary: Record<ComputedProgramStatus, number> = {
    PLAN: 0,
    ON_PROGRESS: 0,
    REALISASI: 0,
    BELUM_TEREALISASI: 0,
  };

  for (const program of programs) {
    const metrics = getProgramMetrics(program, months, now);
    total += 1;
    plan += metrics.plan;
    realization += metrics.realization;
    statusSummary[metrics.status] += 1;
  }

  const notRealized = Math.max(plan - realization, 0);
  const progress = plan > 0 ? Math.min(100, (realization / plan) * 100) : 0;
  return { total, plan, realization, notRealized, progress, statusSummary };
}

export interface MonthlyBreakdownPoint {
  month: string;
  m: number;
  /** Jumlah program ber-Plan pada bulan tsb (baseline per bulan). */
  plan: number;
  /** Jumlah program yang terealisasi penuh pada bulan tsb. */
  realization: number;
  /** Tidak Terealisasi bulan tsb = max(plan - realization, 0). */
  notRealized: number;
  /** progress bulan tsb = realization / plan * 100. */
  progress: number;
}

/**
 * Distribusi Plan/Realisasi/Tidak Terealisasi per bulan.
 * `realization + notRealized` SELALU sama dengan `plan` (bar tidak double count).
 */
export function getMonthlyBreakdown(
  programs: ProgramMetricsLike[],
  months: number[] = ALL_MONTHS,
  now: Date = new Date()
): MonthlyBreakdownPoint[] {
  return months.map((m) => {
    let plan = 0;
    let realization = 0;
    for (const program of programs) {
      const metrics = getProgramMetrics(program, [m], now);
      plan += metrics.plan;
      realization += metrics.realization;
    }
    const notRealized = Math.max(plan - realization, 0);
    const progress = plan > 0 ? Math.min(100, (realization / plan) * 100) : 0;
    return {
      month: PROGRAM_MONTH_SHORT[m - 1] ?? String(m),
      m,
      plan,
      realization,
      notRealized,
      progress,
    };
  });
}

export type NormalizedProgramMetrics<T> = T & { metrics: ProgramMetrics };

/** Normalisasi dataset: setiap program dilengkapi `metrics` sesuai scope filter. */
export function normalizeProgramsWithMetrics<T extends ProgramMetricsLike>(
  programs: T[],
  months?: number[]
): NormalizedProgramMetrics<T>[] {
  return programs.map((p) => ({ ...p, metrics: getProgramMetrics(p, months) }));
}