'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarRange, List, Plus, Search, SlidersHorizontal } from 'lucide-react';
import type { ProgramKerjaDTO, ProgramKerjaStats, ProgramAnnualChartData } from '@/server/services/programKerjaService';
import { deleteProgramKerjaAction } from '@/server/actions/programKerjaActions';
import { ProgramKerjaFormModal } from './ProgramKerjaFormModal';
import { ProgramListView } from './ProgramListView';
import { ProgramTimelineView } from './ProgramTimelineView';
import { ProgramKerjaCharts } from './ProgramKerjaCharts';
import { CATEGORY_LABELS, STATUS_LABELS, MONTH_SHORT } from './shared';

interface PicUserOption {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR';
}

interface ProgramKerjaClientProps {
  programs: ProgramKerjaDTO[];
  stats: ProgramKerjaStats;
  years: number[];
  chart: ProgramAnnualChartData;
  picUsers: PicUserOption[];
}

export function ProgramKerjaClient({ programs, stats, years, chart, picUsers }: ProgramKerjaClientProps) {
  const router = useRouter();
  const [view, setView] = useState<'list' | 'timeline'>('list');
  const [filterYear, setFilterYear] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [query, setQuery] = useState('');
  const [modalProgram, setModalProgram] = useState<ProgramKerjaDTO | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programs.filter((p) => {
      if (filterYear !== 'all' && String(p.year) !== filterYear) return false;
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterMonth !== 'all' && !p.months.some((m) => String(m.month) === filterMonth)) return false;
      if (q) {
        const haystack = `${p.name} ${CATEGORY_LABELS[p.category]} ${p.picName ?? ''} ${p.picUsername ?? ''} ${p.plan ?? ''} ${p.notes ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [programs, filterYear, filterCategory, filterStatus, filterMonth, query]);

  const kpi = useMemo(() => {
    const total = filtered.length;
    const sum = filtered.reduce((a, p) => a + p.progress, 0);
    return {
      total,
      plan: filtered.filter((p) => p.status === 'PLAN').length,
      realisasi: filtered.filter((p) => p.status === 'REALISASI').length,
      avgProgress: total ? Math.round(sum / total) : 0,
      belum: filtered.filter((p) => p.status === 'BELUM_TEREALISASI').length,
    };
  }, [filtered]);

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
    { label: 'Plan', value: String(kpi.plan), accent: 'border-l-slate-400' },
    { label: 'Realisasi', value: String(kpi.realisasi), accent: 'border-l-emerald-500' },
    { label: 'Progress', value: `${kpi.avgProgress}%`, accent: 'border-l-[#F58220]' },
    { label: 'Belum Terealisasi', value: String(kpi.belum), accent: 'border-l-red-500' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-xl border border-[#DCE5EF] border-l-4 bg-white px-4 py-3 shadow-xs ${k.accent}`}>
            <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">{k.label}</div>
            <div className="mt-0.5 text-2xl font-black tabular-nums text-[#092B57]">{k.value}</div>
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
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari program, PIC, kategori..."
                className="field w-full pl-9 text-xs"
              />
            </label>
            <select className="field text-xs" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} aria-label="Filter Tahun">
              <option value="all">Semua Tahun</option>
              {years.map((year) => <option key={year} value={String(year)}>{year}</option>)}
            </select>
            <select className="field text-xs" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter Status">
              <option value="all">Semua Status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="field text-xs" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} aria-label="Filter Bulan">
              <option value="all">Semua Bulan</option>
              {MONTH_SHORT.map((month, index) => <option key={month} value={String(index + 1)}>{month}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:items-center">
            <select className="field text-xs" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Filter Kategori">
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
            <button type="button" onClick={openCreate} className="flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#123B6D] px-3 py-2 text-[11px] font-bold text-white hover:bg-[#0F315A]">
              <Plus className="h-3.5 w-3.5" /> Program
            </button>
          </div>
        </div>
        <div className="mt-2 text-[10px] font-semibold text-slate-400">Menampilkan {filtered.length} dari {programs.length} program · search dan filter kategori dapat digunakan bersamaan.</div>
      </div>

      <ProgramKerjaCharts bar={chart.bar} donut={chart.donut} year={chart.year} />

      {view === 'list' ? (
        <ProgramListView programs={filtered} deletingId={deletingId} onEdit={openEdit} onDelete={handleDelete} />
      ) : (
        <ProgramTimelineView programs={filtered} />
      )}

      <div className="text-[10px] font-semibold text-slate-400">
        Sumber data awal: Dokumen Program Kerja Departemen Distribusi Gas dan Manajemen ORF Tahun 2026 · Total {stats.total} program (P = Plan, R = Realisasi).
      </div>

      {modalOpen && (
        <ProgramKerjaFormModal
          program={modalProgram}
          picUsers={picUsers}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
