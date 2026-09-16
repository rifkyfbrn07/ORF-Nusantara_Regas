'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarRange, FileUp, List, Plus, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import type { ProgramKerjaDTO, ProgramKerjaStats } from '@/server/services/programKerjaService';
import { deleteProgramKerjaAction } from '@/server/actions/programKerjaActions';
import { ProgramKerjaFormModal } from './ProgramKerjaFormModal';
import { ProgramKerjaImportModal } from './ProgramKerjaImportModal';
import { ProgramListView } from './ProgramListView';
import { ProgramTimelineView } from './ProgramTimelineView';
import { ProgramKerjaCharts } from './ProgramKerjaCharts';
import { CATEGORY_LABELS, STATUS_LABELS, MONTH_SHORT, getProgramStatusMeta, getProgramMonthStatus } from './shared';
import { ProgramStatus } from '@prisma/client';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function resetFilters() {
    setFilterYear('all');
    setFilterCategory('all');
    setFilterStatus('all');
    setFilterMonth('all');
    setQuery('');
  }

  // SINGLE SOURCE OF TRUTH: Seluruh filter (tahun, kategori, status, bulan, search)
  // dievaluasi secara konsisten berdasarkan DATA PERIODE AKTUAL.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programs.filter((p) => {
      if (filterYear !== 'all' && String(p.year) !== filterYear) return false;
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;

      // Filter Bulan & Status berbasis period data
      if (filterMonth !== 'all') {
        const m = Number(filterMonth);
        const mStatus = getProgramMonthStatus(p, m);
        if (!mStatus) return false; // Program tidak memiliki aktivitas (plan / realisasi) di bulan terpilih

        if (filterStatus !== 'all' && mStatus !== filterStatus) return false;
      } else {
        if (filterStatus !== 'all') {
          if (filterStatus === 'PLAN') {
            const hasPlan = p.months.some((m) => m.target !== null);
            if (!hasPlan && p.status !== 'PLAN') return false;
          } else if (filterStatus === 'REALISASI') {
            const hasReal = p.months.some((m) => m.realization !== null && m.realization >= 100);
            if (!hasReal) return false;
          } else if (filterStatus === 'ON_PROGRESS') {
            const hasOnProg = p.months.some((m) => m.realization !== null && m.realization > 0 && m.realization < 100);
            if (!hasOnProg && p.status !== 'ON_PROGRESS') return false;
          } else if (filterStatus === 'BELUM_TEREALISASI') {
            const hasBelum = p.months.some((m) => m.realization !== null && m.realization === 0);
            if (!hasBelum && p.status !== 'BELUM_TEREALISASI') return false;
          }
        }
      }

      if (q) {
        const haystack = `${p.name} ${CATEGORY_LABELS[p.category]} ${p.plan ?? ''} ${p.notes ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [programs, filterYear, filterCategory, filterStatus, filterMonth, query]);

  const kpi = useMemo(() => {
    const total = filtered.length;
    const sum = filtered.reduce((a, p) => a + p.progress, 0);

    const isMonthFilter = filterMonth !== 'all';
    const m = isMonthFilter ? Number(filterMonth) : 0;

    const planCount = isMonthFilter
      ? filtered.filter((p) => getProgramMonthStatus(p, m) === 'PLAN').length
      : filtered.filter((p) => p.months.some((x) => x.target !== null)).length;

    const realisasiCount = isMonthFilter
      ? filtered.filter((p) => getProgramMonthStatus(p, m) === 'REALISASI').length
      : filtered.filter((p) => p.months.some((x) => x.realization !== null && x.realization >= 100)).length;

    const belumCount = isMonthFilter
      ? filtered.filter((p) => getProgramMonthStatus(p, m) === 'BELUM_TEREALISASI').length
      : filtered.filter((p) => p.status === 'BELUM_TEREALISASI' || p.months.some((x) => x.realization !== null && x.realization === 0)).length;

    return {
      total,
      plan: planCount,
      realisasi: realisasiCount,
      avgProgress: total ? Math.round(sum / total) : 0,
      belum: belumCount,
    };
  }, [filtered, filterMonth]);

  // SINGLE SOURCE OF TRUTH — seluruh komponen (tabel, KPI, bar, donut)
  // membaca dataset `filtered` yang sama untuk tabel, KPI, bar, dan donut.
  const chartData = useMemo(() => {
    const scope = filterMonth !== 'all' ? [Number(filterMonth)] : Array.from({ length: 12 }, (_, i) => i + 1);

    // Bar — satu titik per bulan pada scope.
    // Dihitung murni berdasarkan period status masing-masing bulan dari filtered dataset.
    const bar = scope.map((m) => {
      const active = filtered.filter((p) => getProgramMonthStatus(p, m) !== null);

      if (filterStatus !== 'all') {
        // Status spesifik → satu seri "Jumlah Program" (tanpa campur status lain).
        const count = active.filter((p) => getProgramMonthStatus(p, m) === filterStatus).length;
        return { month: MONTH_SHORT[m - 1], m, count };
      }

      // Semua status → breakdown status per bulan berdasarkan period status aktual
      const point: { month: string; m: number; [key: string]: number | string } = {
        month: MONTH_SHORT[m - 1],
        m,
        PLAN: 0,
        ON_PROGRESS: 0,
        REALISASI: 0,
        BELUM_TEREALISASI: 0,
      };

      for (const p of active) {
        const statusKey = getProgramMonthStatus(p, m);
        if (statusKey) {
          point[statusKey] = (Number(point[statusKey]) || 0) + 1;
        }
      }
      return point;
    });

    // Donut — selalu dari subset `filtered` yang sama:
    //  - Semua status   → distribusi status (per bulan jika filter bulan aktif).
    //  - Status spesifik → satu iris dengan warna semantic status terpilih.
    const donut =
      filterStatus === 'all'
        ? (() => {
            if (filterMonth !== 'all') {
              const m = Number(filterMonth);
              const dist: Record<string, number> = { PLAN: 0, ON_PROGRESS: 0, REALISASI: 0, BELUM_TEREALISASI: 0 };
              for (const p of filtered) {
                const st = getProgramMonthStatus(p, m);
                if (st) dist[st] = (dist[st] || 0) + 1;
              }
              return (['PLAN', 'ON_PROGRESS', 'REALISASI', 'BELUM_TEREALISASI'] as const)
                .map((statusKey) => {
                  const meta = getProgramStatusMeta(statusKey);
                  return {
                    name: meta.label,
                    value: dist[statusKey] || 0,
                    color: meta.color,
                  };
                })
                .filter((item) => item.value > 0);
            }

            return (['PLAN', 'ON_PROGRESS', 'REALISASI', 'BELUM_TEREALISASI'] as const)
              .map((statusKey) => {
                const meta = getProgramStatusMeta(statusKey);
                return {
                  name: meta.label,
                  value: filtered.filter((p) => p.status === statusKey).length,
                  color: meta.color,
                };
              })
              .filter((item) => item.value > 0);
          })()
        : (() => {
            const meta = getProgramStatusMeta(filterStatus as ProgramStatus);
            return [{ name: meta.label, value: filtered.length, color: meta.color }];
          })();

    const year = filterYear !== 'all' ? Number(filterYear) : 2026;
    return {
      bar,
      donut,
      year,
      monthOnly: filterMonth !== 'all' ? MONTH_SHORT[Number(filterMonth) - 1] : null,
      status: filterStatus,
    };
  }, [filtered, filterYear, filterMonth, filterStatus]);

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
    { label: 'Total Program', value: String(kpi.total), accent: 'border-l-[#0066B3]' },
    { label: 'Plan', value: String(kpi.plan), accent: 'border-l-[#0066B3]' },
    { label: 'Realisasi', value: String(kpi.realisasi), accent: 'border-l-emerald-500' },
    { label: 'Progress', value: `${kpi.avgProgress}%`, accent: 'border-l-[#F58220]' },
    { label: 'Belum Terealisasi', value: String(kpi.belum), accent: 'border-l-red-500' },
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
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="field text-xs text-slate-900 dark:text-slate-100" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} aria-label="Filter Bulan">
              <option value="all">Semua Bulan</option>
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
        <div className="mt-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400">Menampilkan {filtered.length} dari {programs.length} program · search dan filter kategori dapat digunakan bersamaan.</div>
      </div>

      <ProgramKerjaCharts bar={chartData.bar} donut={chartData.donut} year={chartData.year} monthOnly={chartData.monthOnly} status={chartData.status as 'all' | ProgramStatus} />

      {view === 'list' ? (
        <ProgramListView programs={filtered} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
      ) : (
        <ProgramTimelineView programs={filtered} />
      )}

      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        Sumber data awal: Dokumen Program Kerja Departemen Distribusi Gas dan Manajemen ORF Tahun 2026 · Total {stats.total} program (P = Plan, R = Realisasi).
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
    </div>
  );
}
