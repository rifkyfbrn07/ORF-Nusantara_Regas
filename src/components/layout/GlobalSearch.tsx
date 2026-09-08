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
    if (q.length < 2) return; // reset ditangani di handleQueryChange agar tidak setState dalam effect
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
      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder="Cari username, nama, menu, atau informasi..."
        className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-[#0066B3] rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0066B3]/20 transition"
        aria-label="Cari username, nama, menu, atau informasi"
      />
      {loading && (
        <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#0066B3] animate-spin" />
      )}
      {open && query.trim().length >= 2 && (
        <div className="anim-dropdown absolute left-0 right-0 sm:right-auto sm:w-[380px] mt-2 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
          {loading ? (
            <div className="px-4 py-6 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mencari...
            </div>
          ) : error ? (
            <div className="px-4 py-5 flex items-start gap-2 text-xs font-semibold text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <SearchX className="h-5 w-5 mx-auto text-slate-300 mb-1" />
              <p className="text-xs font-bold text-slate-500">Tidak ada hasil untuk &ldquo;{query.trim()}&rdquo;</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Coba kata kunci lain (username, nama, menu).</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {results.map((r, i) => {
                const Icon = TYPE_ICON[r.type] || FileText;
                return (
                  <li key={`${r.href}-${i}`}>
                    <button
                      onClick={() => go(r.href)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition flex items-start gap-2.5 cursor-pointer"
                    >
                      <span className="mt-0.5 h-6 w-6 rounded-md bg-[#EAF4FC] text-[#0066B3] flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#0B3568] truncate">{r.title}</span>
                          <span className="text-[8.5px] font-black uppercase tracking-wide text-slate-400 border border-slate-200 rounded px-1 py-px shrink-0">
                            {TYPE_LABEL[r.type] || r.type}
                          </span>
                        </span>
                        <span className="block text-[10.5px] text-slate-500 truncate">{r.subtitle}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300 mt-1 shrink-0" />
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
