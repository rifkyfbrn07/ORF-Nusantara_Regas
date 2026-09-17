'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { EvidenceViewer } from '@/components/ui/EvidenceViewer';
import type { ProgramKerjaDTO } from '@/server/services/programKerjaService';

const CATEGORY_LABELS: Record<string, string> = {
  PENGADAAN: 'A. Pengadaan',
  RAPAT_KOORDINASI: 'B. Rapat Koordinasi',
  OPERASIONAL_RUTIN: 'C. Operasional Rutin',
  AUDIT: 'D. Audit',
};

const STATUS_LABELS: Record<string, string> = {
  PLAN: 'PLAN',
  REALISASI: 'REALISASI',
  ON_PROGRESS: 'ON PROGRESS',
  BELUM_TEREALISASI: 'TIDAK TEREALISASI',
};

const STATUS_BADGE: Record<string, string> = {
  PLAN: 'bg-blue-50 text-[#0066B3] border-blue-200',
  REALISASI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ON_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  BELUM_TEREALISASI: 'bg-red-50 text-red-700 border-red-200',
};

function ProgressBar({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const color = value >= 100 ? 'bg-emerald-500' : value > 0 ? 'bg-[#F58220]' : 'bg-red-400';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-black">
        <span className="uppercase tracking-wide text-slate-400">Progress</span>
        <span className="tabular-nums text-[#0B3568]">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EvidenceLink({ p, currentUserId }: { p: ProgramKerjaDTO; currentUserId: string }) {
  // Authorization konsisten dengan /api/files/[id]: OPERATOR hanya dapat
  // melihat evidence program yang berupa PIC-nya (server tetap validera).
  if (!p.driveFileId && !p.driveWebViewLink && !p.evidenceUrl) return null;
  if (p.pic?.id !== currentUserId) {
    return (
      <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black whitespace-nowrap">✓ Bukti tersedia</span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black whitespace-nowrap">✓ Bukti tersedia</span>
      <EvidenceViewer file={{ fileId: p.driveFileId, fileName: p.evidenceName, mimeType: p.evidenceMime, fileSize: p.evidenceSize, legacyUrl: p.driveWebViewLink || p.evidenceUrl }} label="Lihat Bukti" />
    </span>
  );
}

function ProgramCard({ p, currentUserId }: { p: ProgramKerjaDTO; currentUserId: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className="space-y-3 rounded-xl border border-[#DCE5EF] bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[9.5px] font-black uppercase tracking-wider text-[#1769AA]">
            {p.sequence} · {CATEGORY_LABELS[p.category]}
          </div>
          <h3 className="mt-0.5 text-sm font-bold leading-snug text-[#0B3568]">{p.name}</h3>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9.5px] font-black tracking-wide whitespace-nowrap ${STATUS_BADGE[p.status]}`}>
          {STATUS_LABELS[p.status]}
        </span>
      </div>

      <ProgressBar value={p.progress} target={p.planTarget} />

      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <div className="font-black uppercase tracking-wide text-slate-400">Target (P)</div>
          <div className="font-semibold text-slate-600">{p.planTarget}%</div>
        </div>
        <div>
          <div className="font-black uppercase tracking-wide text-slate-400">Realisasi (R)</div>
          <div className="font-semibold text-slate-600">{p.progress}%</div>
        </div>
        <div>
          <div className="font-black uppercase tracking-wide text-slate-400">Deadline</div>
          <div className="font-semibold text-slate-600">
            {p.deadline ? new Date(p.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </div>
        </div>
      </div>

      {p.notes && <p className="text-[10.5px] leading-relaxed text-slate-500">{p.notes}</p>}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full cursor-pointer rounded-lg border border-[#E4EBF3] px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50"
      >
        {expanded ? 'Tutup Detail' : 'Lihat Detail'}
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-[#EDF2F7] pt-3">
          {p.plan && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Plan</div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{p.plan}</p>
            </div>
          )}
          {p.realization && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Realisasi</div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{p.realization}</p>
            </div>
          )}
          {p.tasks.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Checklist</div>
              <ul className="mt-1 space-y-1">
                {p.tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <span className={`inline-block h-3.5 w-3.5 shrink-0 rounded border ${t.isDone ? 'border-emerald-400 bg-emerald-500' : 'border-slate-300 bg-white'}`}>
                      {t.isDone && <span className="flex h-full items-center justify-center text-[8px] font-black text-white">✓</span>}
                    </span>
                    <span className={t.isDone ? 'line-through opacity-60' : ''}>{t.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center gap-2">
            <EvidenceLink p={p} currentUserId={currentUserId} />
            <span className="text-[10px] font-semibold text-slate-400">
              Diperbarui {new Date(p.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

export function ProgramKerjaOperatorClient({ programs, currentUserId }: { programs: ProgramKerjaDTO[]; currentUserId: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const visiblePrograms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return programs.filter((program) => {
      if (category !== 'all' && program.category !== category) return false;
      if (!q) return true;
      const haystack = `${program.name} ${CATEGORY_LABELS[program.category]} ${program.plan ?? ''} ${program.notes ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [programs, query, category]);

  const groups = useMemo(() => {
    const order = ['PENGADAAN', 'RAPAT_KOORDINASI', 'OPERASIONAL_RUTIN', 'AUDIT'];
    const map = new Map<string, ProgramKerjaDTO[]>();
    for (const p of visiblePrograms) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return order
      .filter((cat) => map.has(cat))
      .map((cat) => ({ category: cat, label: CATEGORY_LABELS[cat], items: map.get(cat)! }));
  }, [visiblePrograms]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#DCE5EF] bg-white p-4 shadow-xs">
        <div className="grid gap-2.5 sm:grid-cols-[1fr_auto]">
          <label className="relative">
            <span className="sr-only">Cari Program Kerja</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama program, kategori, catatan..."
              className="field w-full pl-9 text-xs"
            />
          </label>
          <select className="field text-xs" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter Kategori">
            <option value="all">Semua Kategori</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="mt-2 text-[10px] font-semibold text-slate-400">
          Menampilkan {visiblePrograms.length} dari {programs.length} program · Operator dapat melihat semua program (read-only).
        </div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-[#DCE5EF] bg-white p-8 text-center text-sm text-slate-400">
          Tidak ada program kerja yang sesuai filter.
        </div>
      )}

      {groups.map((group) => (
        <section key={group.category}>
          <div className="mb-2 border-l-2 border-[#1769AA] pl-2 text-[10px] font-black uppercase tracking-wider text-[#1769AA]">
            {group.label}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {group.items.map((p) => <ProgramCard key={p.id} p={p} currentUserId={currentUserId} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

