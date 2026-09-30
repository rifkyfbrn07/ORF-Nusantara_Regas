'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { ExternalLink, Search } from 'lucide-react';
import { APPLICATIONS } from '@/lib/applications';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * Logo default — dipakai untuk aplikasi yang belum punya logo khusus.
 * PNG transparan asli; container logo memakai surface terang (juga di dark mode)
 * agar tulisan hitam/dark pada logo tetap terbaca — tanpa mengubah warna logo.
 */
const DEFAULT_LOGO = '/images/NREMAS.png';

/**
 * Logo aplikasi (file asli di public/images, TIDAK digenerate ulang):
 *   - NREGAS EMAS  → NREMAS.png
 *   - ICOR 2.0 REFORM → ICOFR.png (cadangan bila aplikasi hadir)
 *   - SIPGAS       → SIPGAS.png
 *   - ActivoX      → ActivoX.png
 * Aplikasi lain tanpa logo khusus memakai DEFAULT_LOGO (NREMAS.png).
 * ICOFR/SIPGAS TIDAK dipakai sebagai fallback.
 */
const APP_LOGO: Record<string, string> = {
  'nregas-emas': '/images/NREMAS.png',
  'gms-pgn': '/images/SIPGAS.png',
  icor: '/images/ICOFR.png',
  activox: '/images/ActivoX.png',
};

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
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-1 dark:border-[rgba(120,190,235,0.18)] dark:bg-white">
                    <Image
                      src={APP_LOGO[app.id] ?? DEFAULT_LOGO}
                      alt={`Logo ${app.name}`}
                      width={40}
                      height={40}
                      className="h-full w-full object-contain object-center"
                    />
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