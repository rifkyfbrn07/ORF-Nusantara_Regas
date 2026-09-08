'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { List, CalendarRange, Plus } from 'lucide-react';
import type { ProgramKerjaDTO, ProgramKerjaStats } from '@/server/services/programKerjaService';
import { deleteProgramKerjaAction } from '@/server/actions/programKerjaActions';
import { ProgramKerjaFormModal } from './ProgramKerjaFormModal';
import { ProgramListView } from './ProgramListView';
import { ProgramTimelineView } from './ProgramTimelineView';
import { ProgramKerjaCharts } from './ProgramKerjaCharts';
import { CATEGORY_LABELS, STATUS_LABELS, MONTH_SHORT } from './shared';
import type { ProgramAnnualChartData } from '@/server/services/programKerjaService';

interface ProgramKerjaClientProps {
  programs: ProgramKerjaDTO[];
  stats: ProgramKerjaStats;
  years: number[];
  chart: ProgramAnnualChartData;
}

export function ProgramKerjaClient({ programs, stats, years, chart }: ProgramKerjaClientProps) {
  const router = useRouter();
  const [view, setView] = useState<'list' | 'timeline'>('list');
  const [filterYear, setFilterYear] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [modalProgram, setModalProgram] = useState<ProgramKerjaDTO | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return programs.filter((p) => {
      if (filterYear !== 'all' && String(p.year) !== filterYear) return false;
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterMonth !== 'all' && !p.months.some((m) => String(m.month) === filterMonth)) return false;
      return true;
    });
  }, [programs, filterYear, filterCategory, filterStatus, filterMonth]);

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

  function openEdit(p: ProgramKerjaDTO) {
    setModalProgram(p);
    setModalOpen(true);
  }

  async function handleDelete(p: ProgramKerjaDTO) {
    if (!window.confirm(`Hapus program "${p.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeletingId(p.id);
    try {
      await deleteProgramKerjaAction(p.id);
      router.refresh();
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
      {/* KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-xl border border-[#DCE5EF] border-l-4 ${k.accent} px-4 py-3 shadow-xs`}>
            <div className="text-[9.5px] font-black tracking-wider uppercase text-slate-400">{k.label}</div>
            <div className="text-2xl font-black text-[#092B57] tabular-nums mt-0.5">{k.value}</div>
          </div>
        ))}
      </div>

      {/* FILTER + VIEW TOGGLE */}
      <div className="bg-white rounded-xl border border-[#DCE5EF] shadow-xs p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 min-w-0">
          <select className="field text-xs" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} aria-label="Filter Tahun">
            <option value="all">Semua Tahun</option>
            {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <select className="field text-xs" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Filter Kategori">
            <option value="all">Semua Kategori</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="field text-xs" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter Status">
            <option value="all">Semua Status</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="field text-xs" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} aria-label="Filter Bulan">
            <option value="all">Semua Bulan</option>
            {MONTH_SHORT.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex rounded-lg border border-[#CBD7E6] overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors cursor-pointer ${view === 'list' ? 'bg-[#0066B3] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors cursor-pointer border-l border-[#CBD7E6] ${view === 'timeline' ? 'bg-[#0066B3] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              <CalendarRange className="h-3.5 w-3.5" /> Timeline
            </button>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg bg-[#123B6D] text-white hover:bg-[#0F315A] cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" /> Program
          </button>
        </div>
      </div>

      {/* GRAFIK TAHUNAN */}
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
