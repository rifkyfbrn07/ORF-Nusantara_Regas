'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ExternalLink, Grid2X2, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { APPLICATIONS } from '@/lib/applications';

/**
 * Menu "Aplikasi" — shortcut menuju aplikasi/website internal (11 aplikasi).
 * - Klik tombol → dropdown/popover berisi daftar aplikasi.
 * - Semua item membuka website eksternal pada TAB BARU (target=_blank,
 *   rel="noopener noreferrer").
 * - Search client-side (tanpa API).
 * - Panel dirender via portal ke <body> agar tidak terpotong oleh
 *   overflow-hidden sidebar, sekaligus tetap aman dipakai di mobile drawer.
 *
 * Posisi panel dihitung saat klik (di event handler, bukan saat render),
 * sehingga tidak melanggar aturan akses ref React.
 */
export function ApplicationsMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [placement, setPlacement] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar panel / tombol Escape (keyboard access).
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Filter client-side.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return APPLICATIONS;
    return APPLICATIONS.filter((app) => `${app.name} ${app.description}`.toLowerCase().includes(q));
  }, [query]);

  // Buka/tutup panel. getBoundingClientRect memberi koordinat viewport meski
  // di dalam elemen bertransformasi (mobile drawer), jadi posisi tetap akurat.
  function togglePanel() {
    if (open) {
      setOpen(false);
      setQuery('');
      return;
    }
    const button = buttonRef.current;
    if (!button || typeof window === 'undefined') return;
    const rect = button.getBoundingClientRect();
    const width = Math.min(560, Math.max(280, window.innerWidth - 16));
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const top = rect.bottom + 8;
    const maxHeight = Math.max(240, window.innerHeight - top - 12);
    setPlacement({ left, top, width, maxHeight });
    setOpen(true);
    setQuery('');
  }

  return (
    <>
      {/* Tombol menu Aplikasi — mengikuti gaya nav item sidebar existing. */}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Aplikasi"
        onClick={togglePanel}
        className={clsx(
          'flex w-full items-center justify-between px-3.5 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all duration-150 group relative cursor-pointer',
          open
            ? 'bg-[#087CC9] text-white font-bold shadow-[0_4px_16px_rgba(8,124,201,0.4),inset_0_1px_0_rgba(255,255,255,0.25)]'
            : 'text-[#123D70] dark:text-[#B9CCDE] hover:bg-[#F4F9FC] dark:hover:bg-[#0088D8]/10 hover:text-[#0077C8] dark:hover:text-[#EAF6FF]'
        )}
      >
        {open && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#69BE28] rounded-r-full shadow-xs" />}
        <span className="flex items-center gap-3 min-w-0">
          <Grid2X2
            strokeWidth={2}
            className={clsx(
              'h-4.5 w-4.5 shrink-0 transition-transform duration-150 group-hover:scale-108',
              open ? 'text-white' : 'text-[#0077C8] dark:text-[#55B9F2] group-hover:text-[#0077C8] dark:group-hover:text-[#38A9EA]'
            )}
          />
          <span className="truncate leading-tight">Aplikasi</span>
        </span>
        <ChevronDown
          className={clsx(
            'w-3.5 h-3.5 transition-transform duration-150 shrink-0',
            open ? 'rotate-180 text-white' : 'text-[#64748B] dark:text-[#7895AD]'
          )}
        />
      </button>
{/* Dropdown / Popover daftar aplikasi (portal ke body). */}
      {open && placement && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              aria-label="Daftar Aplikasi"
              style={{ left: placement.left, top: placement.top, width: placement.width }}
              className="anim-dropdown fixed z-[70] overflow-hidden rounded-2xl border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.18)] bg-white dark:bg-[#0D263E] shadow-2xl text-text-primary"
            >
              {/* Header */}
              <div className="border-b border-[#EDF2F7] dark:border-[rgba(120,190,235,0.16)] px-4 py-3">
                <div className="text-xs font-black uppercase tracking-wider text-text-primary">Aplikasi</div>
                <div className="mt-0.5 text-[10px] font-semibold text-text-muted">Akses aplikasi terkait</div>
              </div>

              {/* Search (client-side, tanpa API) */}
              <div className="border-b border-[#EDF2F7] dark:border-[rgba(120,190,235,0.14)] px-3 py-2.5">
                <label className="relative block">
                  <span className="sr-only">Cari aplikasi</span>
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-[#7E9AB2]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari aplikasi..."
                    aria-label="Cari aplikasi"
                    className="w-full rounded-lg border border-[#CBD7E6] dark:border-[rgba(100,180,230,0.22)] bg-[#F4F9FC] dark:bg-[#081D31] py-1.5 pl-8 pr-3 text-[11.5px] font-semibold text-[#0B3568] dark:text-[#E7F1FA] placeholder:text-slate-400 dark:placeholder:text-[#7E9AB2] outline-none focus:border-[#0077C8] focus:ring-2 focus:ring-[#0077C8]/20"
                  />
                </label>
              </div>

              {/* Daftar aplikasi — scrollable; grid 2 kolom di layar cukup lebar. */}
              <div className="overflow-y-auto scrollbar-thin p-2" style={{ maxHeight: Math.max(140, placement.maxHeight - 118) }}>
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs font-semibold text-text-muted">
                    Tidak ada aplikasi yang cocok.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {filtered.map((app) => (
                      <a
                        key={app.id}
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        role="menuitem"
                        className="group/app flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-[#0077C8]/10 dark:hover:bg-[#143653] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0077C8] dark:focus-visible:outline-[#38BDF8]"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11.5px] font-bold text-[#0B3568] dark:text-[#E7F1FA] group-hover/app:text-[#0077C8] dark:group-hover/app:text-[#38BDF8]">
                            {app.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] font-semibold text-text-muted">
                            {app.description}
                          </span>
                        </span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-[#7E9AB2] transition-colors group-hover/app:text-[#0077C8] dark:group-hover/app:text-[#38BDF8]" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}