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
  | 'REALISASI';

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
// Status ditentukan dari PROGRESS, bukan dari field status database.
//   progress === 0        => PLAN
//   0 < progress < 100    => ON PROGRESS
//   progress >= 100       => REALISASI (label UI: TEREALISASI)
//
// Program dengan progress 100% TIDAK boleh tampil sebagai ON PROGRESS.
export function getProgramStatus(p: { progress: number }): ComputedProgramStatus {
  const progress = Number(p.progress) || 0;
  if (progress >= 100) return ProgramStatus.REALISASI;
  if (progress > 0) return ProgramStatus.ON_PROGRESS;
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
}

/**
 * Setiap program dihitung SATU KALI berdasarkan computedStatus
 * (resolver yang sama dengan tabel). Total kategori = jumlah program.
 */
export function calculateStatusSummary(programs: ProgramKerjaLike[]): StatusSummary {
  const summary: StatusSummary = { PLAN: 0, ON_PROGRESS: 0, REALISASI: 0 };
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
// Model data:
//   - P (Plan) dan R (Realisasi) pada dataset sumber adalah PASANGAN untuk
//     SATU program kerja yang sama. P = baseline/target, R = progress terhadap P.
//   - Satu periode (bulan + minggu) dengan `target !== null` = SATU unit Plan.
//   - Realisasi dihitung HANYA pada periode yang memiliki Plan
//     (`realization / 100` per periode, sehingga 0..1 per periode).
//   - Realisasi TIDAK pernah menghapus Plan dan TIDAK pernah menambah program.
//
// Seluruh KPI, filter, tabel, bar chart, dan donut halaman Program Kerja WAJIB
// memakai fungsi-fungsi di bawah ini — tidak boleh ada perhitungan mandiri di
// komponen lain (Rule 16: single source of truth).
// ============================================================================

/** Program apa pun yang memiliki `months` (cukup untuk hitung metrik). */
export type ProgramMetricsLike = { months?: ProgramKerjaMonthLike[] };

export interface ProgramMetrics {
  /** Jumlah unit Plan (periode minggu ber-target) dalam scope — baseline. */
  plan: number;
  /** Jumlah unit Plan yang terealisasi (nilai R/100 per periode) dalam scope. */
  realization: number;
  /** Sisa Plan = max(plan - realization, 0). Tidak pernah negatif. */
  remaining: number;
  /** progress = plan > 0 ? (realization / plan) * 100 : 0. Tidak pernah NaN/Infinity. */
  progress: number;
  /**
   * Status turunan dari progress:
   *   progress === 0      → PLAN
   *   0 < progress < 100  → ON PROGRESS
   *   progress >= 100     → REALISASI (label UI: TEREALISASI)
   */
  status: ComputedProgramStatus;
}

export const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * Hitung metrik Plan/Realisasi sebuah program pada `months` (null/undefined =
 * seluruh Januari–Desember). Plan tetap dipertahankan meskipun sudah 100%.
 */
export function getProgramMetrics(
  p: ProgramMetricsLike,
  months?: number[]
): ProgramMetrics {
  const scope = months && months.length > 0 ? new Set(months) : null;
  let plan = 0;
  let realization = 0;

  for (const m of p.months ?? []) {
    if (m.month === undefined) continue;
    if (scope && !scope.has(m.month)) continue;
    // Plan dihitung dari keberadaan target (sel biru/jadwal), BUKAN dari nilai 100.
    if (m.target === null || m.target === undefined) continue;

    plan += 1;
    if (m.realization !== null && m.realization !== undefined) {
      // Nilai R dalam persen (0..100). 100 → 1 unit, 50 → 0.5 unit, 0 → 0 unit.
      realization += Math.min(1, Math.max(0, m.realization / 100));
    }
  }

  const remaining = Math.max(plan - realization, 0);
  // Progress dikunci maksimal 100% (Rule 15 CASE 4: realisasi > plan tetap 100%).
  const progress = plan > 0 ? Math.min(100, (realization / plan) * 100) : 0;
  return {
    plan,
    realization,
    remaining,
    progress,
    status: getProgramStatus({ progress }),
  };
}
export interface ProgramAggregateMetrics {
  /** Jumlah program unik dalam dataset (P/R tidak pernah dihitung terpisah). */
  total: number;
  /** Total seluruh Plan (baseline) dalam scope — tidak pernah berkurang saat realisasi. */
  plan: number;
  /** Total seluruh Realisasi terhadap Plan dalam scope. */
  realization: number;
  /** Total Sisa Plan = max(plan - realization, 0). */
  remaining: number;
  /** progress agregat (weighted terhadap Plan) = realization / plan * 100. */
  progress: number;
  /** Distribusi program berdasarkan status turunan dari progress. */
  statusSummary: Record<ComputedProgramStatus, number>;
}

/** Agregasi lintas program untuk KPI, donut, dan subtitle grafik. */
export function getAggregateProgramMetrics(
  programs: ProgramMetricsLike[],
  months?: number[]
): ProgramAggregateMetrics {
  let total = 0;
  let plan = 0;
  let realization = 0;
  const statusSummary: Record<ComputedProgramStatus, number> = {
    PLAN: 0,
    ON_PROGRESS: 0,
    REALISASI: 0,
  };

  for (const program of programs) {
    const metrics = getProgramMetrics(program, months);
    total += 1;
    plan += metrics.plan;
    realization += metrics.realization;
    statusSummary[metrics.status] += 1;
  }

  const remaining = Math.max(plan - realization, 0);
  const progress = plan > 0 ? Math.min(100, (realization / plan) * 100) : 0;
  return { total, plan, realization, remaining, progress, statusSummary };
}

export interface MonthlyBreakdownPoint {
  month: string;
  m: number;
  /** Total Plan pada bulan tsb (baseline yang selalu dipertahankan). */
  plan: number;
  /** Total Realisasi pada bulan tsb. */
  realization: number;
  /** Sisa Plan pada bulan tsb = max(plan - realization, 0). */
  remaining: number;
  /** progress bulan tsb = realization / plan * 100. */
  progress: number;
}

/**
 * Distribusi Plan/Realisasi/Remaining per bulan — bahan bar chart.
 * `realisasi + remaining` SELALU sama dengan `plan` (Rule 8).
 */
export function getMonthlyBreakdown(
  programs: ProgramMetricsLike[],
  months: number[] = ALL_MONTHS
): MonthlyBreakdownPoint[] {
  return months.map((m) => {
    let plan = 0;
    let realization = 0;
    for (const program of programs) {
      const metrics = getProgramMetrics(program, [m]);
      plan += metrics.plan;
      realization += metrics.realization;
    }
    const remaining = Math.max(plan - realization, 0);
    const progress = plan > 0 ? Math.min(100, (realization / plan) * 100) : 0;
    return {
      month: PROGRAM_MONTH_SHORT[m - 1] ?? String(m),
      m,
      plan,
      realization,
      remaining,
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