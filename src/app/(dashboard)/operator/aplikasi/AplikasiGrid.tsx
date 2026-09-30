'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  ClipboardCheck,
  ExternalLink,
  Factory,
  FileCheck2,
  Globe2,
  GraduationCap,
  Handshake,
  HardHat,
  KeyRound,
  Plane,
  Search,
  Settings2,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { APPLICATIONS } from '@/lib/applications';
import { EmptyState } from '@/components/ui/EmptyState';

/** Ikon + warna tile per aplikasi — palet design system existing, tanpa gradient berlebihan. */
const APP_META: Record<string, { icon: LucideIcon; tile: string }> = {
  'intra-iam': { icon: ShieldCheck, tile: 'bg-blue-50 text-[#0077C8] border-blue-100' },
  idaman: { icon: KeyRound, tile: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  esimi: { icon: Settings2, tile: 'bg-slate-100 text-slate-600 border-slate-200' },
  'gms-pgn': { icon: Activity, tile: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  digitravel: { icon: Plane, tile: 'bg-sky-50 text-sky-600 border-sky-100' },
  ims: { icon: ClipboardCheck, tile: 'bg-teal-50 text-teal-600 border-teal-100' },
  estk: { icon: FileCheck2, tile: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
  evendor: { icon: Handshake, tile: 'bg-violet-50 text-violet-600 border-violet-100' },
  'nregas-emas': { icon: Factory, tile: 'bg-orange-50 text-[#F58220] border-orange-100' },
  lms: { icon: GraduationCap, tile: 'bg-amber-50 text-amber-600 border-amber-100' },
  portal: { icon: Globe2, tile: 'bg-[#EAF4FC] text-[#0066B3] border-[#BBDFF5]' },
  ptw: { icon: HardHat, tile: 'bg-red-50 text-red-600 border-red-100' },
};

const FALLBACK_META = { icon: Globe2, tile: 'bg-slate-100 text-slate-600 border-slate-200' };

export function AplikasiGrid() {
  const [query, setQuery] = useState('');

  // Search client-side (nama + description), tanpa API.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return APPLICATIONS;
    return APPLICATIONS.filter((app) => `${app.name} ${app.description}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Cari aplikasi</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-[#7E9AB2]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari aplikasi..."
            aria-label="Cari aplikasi"
            className="field w-full pl-9 text-xs"
          />
        </label>
        <span className="text-[10.5px] font-semibold text-text-muted">
          Menampilkan {filtered.length} dari {APPLICATIONS.length} aplikasi
        </span>
      </div>

      {/* Application Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada aplikasi yang ditemukan."
          description="Periksa kembali kata kunci pencarian Anda."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((app) => {
            const meta = APP_META[app.id] ?? FALLBACK_META;
            const Icon = meta.icon;
            return (
              <a
                key={app.id}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Buka ${app.name} di tab baru`}
                className="group/card flex h-full flex-col rounded-2xl border border-[#DCE5EF] bg-white p-4 shadow-xs transition-all duration-150 hover:border-[#0077C8]/50 hover:bg-[#F4F9FC] hover:shadow-md dark:border-[rgba(120,190,235,0.14)] dark:bg-[#0D263E] dark:hover:border-[#38BDF8]/40 dark:hover:bg-[#143653] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077C8] dark:focus-visible:outline-[#38BDF8]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta.tile}`}>
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover/card:text-[#0077C8] dark:group-hover/card:text-[#38BDF8]" />
                </div>
                <div className="mt-3 truncate text-[13px] font-bold text-[#0B3568] dark:text-[#E7F1FA]">{app.name}</div>
                <div className="mt-0.5 truncate text-[11px] font-semibold text-text-muted">{app.description}</div>
                <div className="mt-auto pt-3 text-[10.5px] font-bold text-[#0077C8] dark:text-[#38BDF8] group-hover/card:underline">
                  Buka aplikasi&nbsp;↗
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}