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
import { CATEGORY_LABELS, STATUS_LABELS, MONTH_SHORT, getProgramStatusMeta } from './shared';
import {
  normalizePrograms,
  calculateKPI,
  calculateStatusSummary,
  calculateMonthlyDistribution,
  isActiveInMonth,
  isBelumTerealisasi,
} from '@/lib/programKerjaLogic';
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

  // ============================================================================
  // SINGLE SOURCE OF TRUTH (Rule 3 & 12)
  // ----------------------------------------------------------------------------
  // `normalizedPrograms` adalah dataset tunggal yang dipakai seluruh komponen
  // (KPI, bar chart, donut, tabel, timeline). Setiap program dilengkapi
  // `computedStatus` = getProgramStatus(progress) — resolver status yang sama
  // untuk semua halaman. Filter (search, tahun, kategori, bulan, status)
  // lalu menghasilkan `filtered` yang dipakai KPI/chart/donut/tabel sekaligus.
  // ============================================================================
  const normalizedPrograms = useMemo(() => normalizePrograms(programs), [programs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return normalizedPrograms.filter((p) => {
      if (filterYear !== 'all' && String(p.year) !== filterYear) return false;
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;

      // Filter Bulan — program harus memiliki aktivitas (Plan/Realisasi) di bulan tsb.
      if (filterMonth !== 'all') {
        if (!isActiveInMonth(p, Number(filterMonth))) return false;
      }

      // Filter Status — selalu berdasarkan `computedStatus` (progress), bukan field status db.
      if (filterStatus !== 'all') {
        if (filterStatus === 'BELUM_TEREALISASI') {
          // BELUM_TEREALISASI adalah indikator KPI: progress < 100.
          if (!isBelumTerealisasi(p)) return false;
        } else if (p.computedStatus !== filterStatus) {
          return false;
        }
      }

      if (q) {
        const haystack = `${p.name} ${CATEGORY_LABELS[p.category]} ${p.plan ?? ''} ${p.notes ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [normalizedPrograms, filterYear, filterCategory, filterStatus, filterMonth, query]);

  // KPI dihitung dari dataset `filtered` yang SAMA dengan bar/donut/tabel.
  const kpi = useMemo(() => calculateKPI(filtered), [filtered]);

  // Bar & Donut — keduanya dihitung dari dataset `filtered` yang SAMA dengan
  // KPI dan tabel (Rule 10 & 11). Tidak ada subset/agregasi berbeda di sini.
  const chartData = useMemo(() => {
    const scope = filterMonth !== 'all' ? [Number(filterMonth)] : Array.from({ length: 12 }, (_, i) => i + 1);

    // BAR — "Distribusi Program Kerja per Bulan".
    // Setiap program yang aktif di suatu bulan dihitung 1x dengan `computedStatus`
    // (resolver yang sama dengan KPI/donut). Bukan angka statis/dummy.
    const bar =
      filterStatus === 'all'
        ? calculateMonthlyDistribution(filtered, scope)
        : (() => {
            const scopePrograms = filtered.filter((p) =>
              filterStatus === 'BELUM_TEREALISASI'
                ? isBelumTerealisasi(p)
                : p.computedStatus === filterStatus
            );
            return scope.map((m) => ({
              month: MONTH_SHORT[m - 1],
              m,
              count: scopePrograms.filter((p) => isActiveInMonth(p, m)).length,
            }));
          })();

    // DONUT — "Ringkasan Status" dari aggregasi `computedStatus` yang sama
    // dengan tabel (setiap program dihitung tepat sekali).
    const donut =
      filterStatus === 'all'
        ? (() => {
            const dist = calculateStatusSummary(filtered);
            return (['PLAN', 'ON_PROGRESS', 'REALISASI'] as const)
              .map((statusKey) => {
                const meta = getProgramStatusMeta(statusKey);
                return { name: meta.label, value: dist[statusKey], color: meta.color };
              })
              .filter((item) => item.value > 0);
          })()
        : (() => {
            const meta = getProgramStatusMeta(filterStatus as ProgramStatus);
            return [{ name: meta.label, value: filtered.length, color: meta.color }];
          })();

    const year = filterYear !== 'all' ? Number(filterYear) : (programs[0]?.year ?? 2026);
    return {
      bar,
      donut,
      year,
      monthOnly: filterMonth !== 'all' ? MONTH_SHORT[Number(filterMonth) - 1] : null,
      status: filterStatus,
    };
  }, [filtered, filterYear, filterMonth, filterStatus, programs]);

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
    { label: 'Belum Terealisasi', value: String(kpi.belumTerealisasi), accent: 'border-l-red-500' },
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
