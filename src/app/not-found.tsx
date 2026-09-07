import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col items-center justify-center p-6 text-center">
      <div className="anim-fade-up bg-white rounded-2xl border border-[#DCE6F2] shadow-xl p-8 sm:p-12 max-w-md w-full space-y-6">
        {/* REGAS Logo */}
        <div className="flex justify-center">
          <Image
            src="/images/regas.png"
            alt="Pertamina Nusantara Regas"
            width={80}
            height={48}
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* 404 Illustration Badge */}
        <div className="space-y-2">
          <span className="text-4xl sm:text-5xl font-black text-[#0F2F63] tracking-tight block">
            404
          </span>
          <h1 className="text-base sm:text-lg font-black text-[#172033]">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Halaman operasional yang Anda tuju tidak tersedia, telah dipindahkan, atau Anda tidak
            memiliki izin untuk mengakses tautan ini.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#123E7A] hover:bg-[#0F2F63] text-white text-xs font-bold transition shadow-sm"
          >
            <Home className="h-4 w-4" />
            <span>Kembali ke Dashboard</span>
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#123E7A] text-xs font-bold transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Halaman Login</span>
          </Link>
        </div>
      </div>

      <p className="mt-6 text-[11px] text-[#64748B]">
        Pertamina Nusantara Regas · REGAS FIELDOPS
      </p>
    </div>
  );
}
