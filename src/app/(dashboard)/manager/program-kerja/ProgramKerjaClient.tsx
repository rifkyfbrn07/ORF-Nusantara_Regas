'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarRange, FileUp, List, Plus, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import type { ProgramKerjaDTO, ProgramKerjaStats } from '@/server/services/programKerjaService';
import { deleteProgramKerjaAction } from '@/server/actions/programKerjaActions';
import { ProgramKerjaFormModal } from './ProgramKerjaFormModal';
import { ProgramKerjaImportModal } from './ProgramKerjaImportModal';
import { ProgramDetailModal } from './ProgramDetailModal';
import { ProgramListView } from './ProgramListView';
import { ProgramTimelineView } from './ProgramTimelineView';
import { CATEGORY_LABELS, MONTH_SHORT, STATUS_COLORS, STATUS_FILTER_OPTIONS, STATUS_LABELS, fmtNumber, fmtPercent, getProgramMonthStatus } from './shared';
import {
  ALL_MONTHS,
  getAggregateProgramMetrics,
  getProgramCurrentStatus,
  getProgramMetrics,
  isActiveInMonth,
} from '@/lib/programKerjaLogic';
import type { ProgramStatus } from '@prisma/client';
import { ProgramKerjaCharts } from './ProgramKerjaCharts';
import type { ChartMonthPoint, DonutSlice } from './ProgramKerjaCharts';

export interface ProgramKerjaPicUser {
  id: string;
  name: string;
  username: string;
  position: string | null;
}

interface ProgramKerjaClientProps {
  programs: ProgramKerjaDTO[];
  stats: ProgramKerjaStats;
  years: number[];
  picUsers: ProgramKerjaPicUser[];
}

export function ProgramKerjaClient({ programs, stats, years, picUsers }: ProgramKerjaClientProps) {
  const router = useRouter();
  const [view, setView] = useState<'list' | 'timeline'>('list');
  const [filterYear, setFilterYear] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [query, setQuery] = useState('');
  const [modalProgram, setModalProgram] = useState<ProgramKerjaDTO | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detailProgram, setDetailProgram] = useState<ProgramKerjaDTO | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function resetFilters() {
    setFilterYear('all');
    setFilterCategory('all');
    setFilterStatus('all');
    setFilterMonth('all');
    setQuery('');
  }

  // ============================================================================
  // SINGLE SOURCE OF TRUTH (Rule 16)
  // ----------------------------------------------------------------------------
  // Dataset yang sama (`normalizedPrograms`) dipakai oleh KPI, filter, tabel,
  // timeline, bar chart, dan donut. Setiap program dilengkapi `metrics` yang
  // dihitung dari periode Plan/Realisasi (`getProgramMetrics`) sesuai scope:
  //   - PER BULAN → hanya bulan yang dipilih (Rule 3 & 11)
  //   - PER TAHUN → seluruh bulan Januari–Desember (Rule 4 & 12)
  // Plan (baseline) TIDAK pernah dihapus ketika ada Realisasi (Rule 6 & 14).
  // ============================================================================
  const scopeMonths = useMemo(
    () => (filterMonth !== 'all' ? [Number(filterMonth)] : ALL_MONTHS),
    [filterMonth]
  );

  const normalizedPrograms = useMemo(
    () => programs.map((p) => ({ ...p, metrics: getProgramMetrics(p, scopeMonths) })),
    [programs, scopeMonths]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return normalizedPrograms.filter((p) => {
      if (filterYear !== 'all' && String(p.year) !== filterYear) return false;
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;

      // PER BULAN — program harus memiliki aktivitas (Plan/Realisasi) pada bulan tsb.
      if (filterMonth !== 'all' && !isActiveInMonth(p, Number(filterMonth))) return false;

      // Status filter mengikuti status PROGRAM yang sebenarnya (progress tersimpan
      // + TIDAK TEREALISASI existing) — konsisten dengan badge tabel & donut.
      if (filterStatus !== 'all' && getProgramCurrentStatus(p) !== filterStatus) return false;

      if (q) {
        const haystack = `${p.name} ${CATEGORY_LABELS[p.category]} ${p.plan ?? ''} ${p.notes ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [normalizedPrograms, filterYear, filterCategory, filterStatus, filterMonth, query]);

  // KPI / tabel / filter tetap memakai `getAggregateProgramMetrics` & `getProgramMetrics`
  // yang SAMA (tidak diubah). Bar chart memakai agregasi per-bulan Program-count.
  const aggregate = useMemo(() => getAggregateProgramMetrics(filtered, scopeMonths), [filtered, scopeMonths]);

  // Grouped bar "Plan vs Realisasi per Bulan":
  //   Plan        = jumlah Program yang punya Plan pada bulan tsb (baseline —
  //                 tidak pernah berkurang meskipun sudah terealisasi).
  //   Realisasi   = periode bulan tsb R=100, ATAU Program sekarang TEREALISASI
  //                 dan bulan tsb punya catatan realisasi > 0 (mengikuti update).
  //   Tidak       = periode bulan tsb R=0 (TIDAK TEREALISASI) selama Program
  //                 TIDAK sedang ON PROGRESS / sudah TEREALISASI.
  // Program ON PROGRESS TIDAK dihitung sebagai Tidak Terealisasi.
  const bar = useMemo<ChartMonthPoint[]>(() => {
    return scopeMonths.map((m) => {
      let plan = 0;
      let realization = 0;
      let notRealized = 0;
      for (const p of filtered) {
        const hasPlan = (p.months ?? []).some((x) => x.month === m && x.target !== null);
        if (!hasPlan) continue;
        plan += 1;
        const monthStatus = getProgramMonthStatus(p, m);
        const currentStatus = getProgramCurrentStatus(p);
        const monthRealVals = (p.months ?? []).filter((x) => x.month === m && x.realization !== null).map((x) => x.realization as number);
        if (monthStatus === 'REALISASI' || (currentStatus === 'REALISASI' && monthRealVals.some((v) => v > 0))) {
          realization += 1;
        } else if (monthStatus === 'BELUM_TEREALISASI' && currentStatus !== 'ON_PROGRESS' && currentStatus !== 'REALISASI') {
          notRealized += 1;
        }
      }
      return { month: MONTH_SHORT[m - 1], m, plan, realization, notRealized };
    });
  }, [filtered, scopeMonths]);

  // Donut — distribusi STATUS Program (mengikuti data status Program yang
  // sebenarnya: progress 0 → PLAN, 0<x<100 → ON PROGRESS, 100 → TEREALISASI,
  // TIDAK TEREALISASI dari status existing saat progress 0).
  const donut = useMemo<DonutSlice[]>(() => {
    const total = filtered.length;
    const counts: Record<ProgramStatus, number> = { PLAN: 0, ON_PROGRESS: 0, REALISASI: 0, BELUM_TEREALISASI: 0 };
    for (const p of filtered) counts[getProgramCurrentStatus(p)] += 1;
    return (
      (['PLAN', 'ON_PROGRESS', 'REALISASI', 'BELUM_TEREALISASI'] as const)
        .map((s) => ({
          id: s,
          name: STATUS_LABELS[s],
          value: counts[s],
          percent: total > 0 ? (counts[s] / total) * 100 : 0,
          color: STATUS_COLORS[s],
        }))
        .filter((slice) => slice.value > 0)
    );
  }, [filtered]);

  const year = filterYear !== 'all' ? Number(filterYear) : (programs[0]?.year ?? 2026);
  const monthOnly = filterMonth !== 'all' ? MONTH_SHORT[Number(filterMonth) - 1] : null;
  const periodLabel = filterMonth !== 'all' ? `PER BULAN — ${monthOnly} ${year}` : `PER TAHUN — ${year}`;

  function openCreate() {
    setModalProgram(null);
    setModalOpen(true);
  }

  function openEdit(program: ProgramKerjaDTO) {
    setModalProgram(program);
    setModalOpen(true);
  }

  async function handleDelete(program: ProgramKerjaDTO) {
    if (!window.confirm(`Hapus program "${program.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeletingId(program.id);
    try {
      const result = await deleteProgramKerjaAction(program.id);
      if (!result.success) window.alert(result.error);
      else router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const kpis = [
    { label: 'Total Program', value: fmtNumber(aggregate.total), accent: 'border-l-[#0066B3]' },
    { label: 'Plan', value: fmtNumber(aggregate.plan), accent: 'border-l-[#0066B3]' },
    { label: 'Realisasi', value: fmtNumber(aggregate.realization), accent: 'border-l-emerald-500' },
    { label: 'Progress', value: `${fmtPercent(aggregate.progress)}%`, accent: 'border-l-[#F58220]' },
    { label: 'Remaining', value: fmtNumber(aggregate.remaining), accent: 'border-l-slate-400' },
  ];

  return (
    <div className="space-y-5 dashboard-enter">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className={`anim-fade-up stagger-${i + 1} rounded-xl border border-[#DCE5EF] border-l-4 bg-white px-4 py-3 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${k.accent}`}
          >
            <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{k.label}</div>
            <div className="mt-0.5 text-2xl font-black tabular-nums text-[#092B57] dark:text-slate-100">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#DCE5EF] bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#0066B3]">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Struktur Program Kerja
        </div>
        <div className="grid gap-2.5 lg:grid-cols-[1fr_auto]">
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="relative sm:col-span-2 lg:col-span-1">
              <span className="sr-only">Cari Program Kerja</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari program, kategori..."
                className="field w-full pl-9 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
            </label>
            <select className="field text-xs text-slate-900 dark:text-slate-100" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} aria-label="Filter Tahun">
              <option value="all">Semua Tahun</option>
              {years.map((year) => <option key={year} value={String(year)}>{year}</option>)}
            </select>
            <select className="field text-xs text-slate-900 dark:text-slate-100" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter Status">
              <option value="all">Semua Status</option>
              {STATUS_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select className="field text-xs text-slate-900 dark:text-slate-100" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} aria-label="Filter Bulan / Periode">
              <option value="all">Per Tahun (Jan–Des)</option>
              {MONTH_SHORT.map((month, index) => <option key={month} value={String(index + 1)}>{month}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:items-center">
            <select className="field text-xs text-slate-900 dark:text-slate-100" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Filter Kategori">
              <option value="all">Semua Kategori</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <div className="flex shrink-0 overflow-hidden rounded-lg border border-[#CBD7E6]">
              <button type="button" onClick={() => setView('list')} className={`flex cursor-pointer items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors ${view === 'list' ? 'bg-[#0066B3] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                <List className="h-3.5 w-3.5" /> List
              </button>
              <button type="button" onClick={() => setView('timeline')} className={`flex cursor-pointer items-center gap-1.5 border-l border-[#CBD7E6] px-3 py-2 text-[11px] font-bold transition-colors ${view === 'timeline' ? 'bg-[#0066B3] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                <CalendarRange className="h-3.5 w-3.5" /> Timeline
              </button>
            </div>
            <button type="button" onClick={resetFilters} className="flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#CBD7E6] bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button type="button" onClick={() => setImportOpen(true)} className="flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-500 bg-white px-3 py-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50">
              <FileUp className="h-3.5 w-3.5" /> Import Excel
            </button>
            <button type="button" onClick={openCreate} className="flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#123B6D] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#0F315A]">
              <Plus className="h-3.5 w-3.5" /> Program
            </button>
          </div>
        </div>
        <div className="mt-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400">{periodLabel} · Menampilkan {filtered.length} dari {programs.length} program · search, kategori, dan status dapat digunakan bersamaan.</div>
      </div>

      <ProgramKerjaCharts bar={bar} donut={donut} status={filterStatus as 'all' | ProgramStatus} />

      {view === 'list' ? (
        <ProgramListView programs={filtered} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} onOpenUpdate={setDetailProgram} />
      ) : (
        <ProgramTimelineView programs={filtered} onOpenUpdate={setDetailProgram} />
      )}

      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        Sumber data awal: Dokumen Program Kerja Departemen Distribusi Gas dan Manajemen ORF Tahun 2026 · {stats.total} program (P = Plan, R = Realisasi). Plan adalah baseline dan tidak pernah dihapus ketika sudah terealisasi.
      </div>

      {modalOpen && (
        <ProgramKerjaFormModal
          program={modalProgram}
          users={picUsers}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            router.refresh();
          }}
        />
      )}

      {importOpen && (
        <ProgramKerjaImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
        />
      )}

      {detailProgram && (
        <ProgramDetailModal
          program={detailProgram}
          canSubmit
          onClose={() => setDetailProgram(null)}
        />
      )}
    </div>
  );
}
