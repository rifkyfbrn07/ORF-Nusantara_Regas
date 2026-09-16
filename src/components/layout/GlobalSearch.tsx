'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, SearchX, AlertCircle, FileText, Users, Menu as MenuIcon, ArrowRight } from 'lucide-react';

interface SearchResult {
  type: string;
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  MENU: MenuIcon,
  USER: Users,
  PROGRAM: FileText,
};

const TYPE_LABEL: Record<string, string> = {
  MENU: 'Menu',
  USER: 'Pengguna',
  PROGRAM: 'Program',
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('gagal');
        const data = (await res.json()) as { results: SearchResult[] };
        setSearchResults(data.results || []);
        setError(null);
        setOpen(true);
      } catch {
        setError('Gagal memuat hasil pencarian.');
        setSearchResults([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setSearchResults([]);
      setLoading(false);
      setError(null);
      setOpen(false);
    }
  }

  function go(href: string) {
    setOpen(false);
    setQuery('');
    setSearchResults([]);
    router.push(href);
  }

  return (
    <div className="relative w-full" ref={boxRef}>
      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#7FB4D6] pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder="Cari username, nama, menu, atau informasi..."
        className="w-full pl-8.5 pr-8 py-2 text-xs bg-[#F4F9FC] dark:bg-[#081D31] hover:bg-white dark:hover:bg-[#0A2238] focus:bg-white dark:focus:bg-[#081D31] border border-[#E2E8F0] dark:border-[rgba(100,180,230,0.16)] focus:border-[#0077C8] dark:focus:border-[#38A9EA] rounded-xl text-[#0B3568] dark:text-[#EAF5FC] placeholder-[#64748B] dark:placeholder-[#8FA9BE] focus:outline-none focus:ring-2 focus:ring-[#0077C8]/20 dark:focus:ring-[#38A9EA]/20 transition"
        aria-label="Cari username, nama, menu, atau informasi"
      />
      {loading && (
        <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#0077C8] dark:text-[#38A9EA] animate-spin" />
      )}
      {open && query.trim().length >= 2 && (
        <div className="anim-dropdown absolute left-0 right-0 sm:right-auto sm:w-[380px] mt-2 bg-white dark:bg-[#102B45] rounded-2xl shadow-2xl border border-[#E2E8F0] dark:border-[rgba(100,180,230,0.20)] z-50 overflow-hidden">
          {loading ? (
            <div className="px-4 py-6 flex items-center justify-center gap-2 text-xs font-semibold text-[#64748B] dark:text-[#8FA9BE]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0077C8] dark:text-[#38A9EA]" /> Mencari...
            </div>
          ) : error ? (
            <div className="px-4 py-5 flex items-start gap-2 text-xs font-semibold text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <SearchX className="h-5 w-5 mx-auto text-[#64748B] dark:text-[#8FA9BE] mb-1" />
              <p className="text-xs font-bold text-[#0B3568] dark:text-[#EAF4FB]">Tidak ada hasil untuk &ldquo;{query.trim()}&rdquo;</p>
              <p className="text-[10px] text-[#64748B] dark:text-[#8FA9BE] mt-0.5">Coba kata kunci lain (username, nama, menu).</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-[#E2E8F0] dark:divide-[rgba(100,180,230,0.12)] scrollbar-thin">
              {results.map((r, i) => {
                const Icon = TYPE_ICON[r.type] || FileText;
                return (
                  <li key={`${r.href}-${i}`}>
                    <button
                      onClick={() => go(r.href)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-[#F4F9FC] dark:hover:bg-[#143A59] transition flex items-start gap-2.5 cursor-pointer"
                    >
                      <span className="mt-0.5 h-6 w-6 rounded-lg bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#38A9EA] flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#0B3568] dark:text-[#EAF4FB] truncate">{r.title}</span>
                          <span className="text-[8.5px] font-black uppercase tracking-wide text-[#64748B] dark:text-[#8FA9BE] border border-[#E2E8F0] dark:border-[rgba(100,180,230,0.20)] rounded px-1 py-px shrink-0">
                            {TYPE_LABEL[r.type] || r.type}
                          </span>
                        </span>
                        <span className="block text-[10.5px] text-[#64748B] dark:text-[#8FA9BE] truncate">{r.subtitle}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#64748B] dark:text-[#8FA9BE] mt-1 shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
