'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

/**
 * Friendly error boundary for the whole dashboard area.
 * Never exposes raw Prisma / stack traces to users.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log for developers only — user-facing message stays generic
    console.error('[FIELDOPS] Dashboard error:', error.message);
  }, [error]);

  const isAuthError = error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN';

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="anim-fade-up bg-white rounded-2xl border border-[#DCE6F2] shadow-xl p-8 max-w-md text-center space-y-4">
        <div
          className={`h-14 w-14 rounded-2xl mx-auto flex items-center justify-center ${
            isAuthError ? 'bg-[#FFF1E6] text-[#F58220]' : 'bg-red-50 text-[#DC2626]'
          }`}
        >
          <AlertOctagon className="h-7 w-7" />
        </div>

        <h1 className="text-lg font-black text-[#0F2F63]">
          {isAuthError ? 'Akses Operasional Dibatasi' : 'Gangguan Sistem Operasional'}
        </h1>

        <p className="text-xs text-[#64748B] leading-relaxed">
          {isAuthError
            ? 'Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi manajer operasional jika Anda merasa ini keliru.'
            : 'Data operasional belum dapat dimuat. Silakan coba lagi dalam beberapa saat.'}
        </p>

        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#123E7A] hover:bg-[#0F2F63] text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Coba Lagi
          </button>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#CBD5E1] text-[#123E7A] hover:bg-[#F8FAFC] text-xs font-bold transition cursor-pointer"
          >
            <Home className="h-3.5 w-3.5" />
            Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
