'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User as UserIcon, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck, UserCheck } from 'lucide-react';
import { loginAction } from '@/server/actions/authActions';
import { FsuVesselIllustration } from '@/components/branding/FsuVesselIllustration';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginAction({ username, password });
      if (!res.success) {
        setError(res.error || 'Login gagal. Periksa username dan kata sandi Anda.');
        setLoading(false);
      } else {
        router.push(res.redirectTo || '/');
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      if (msg.includes('was not found on the server') || msg.includes('Failed to fetch')) {
        window.location.reload();
        return;
      }
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#08243F]">
      {/* Background full area: /Background.svg + overlay + visual FSRU */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Background.svg"
          alt="Terminal LNG — Distribusi Gas & ORF"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#08243F]/75 via-[#0B3568]/55 to-[#08243F]/85" />
        <div className="absolute bottom-0 left-0 right-0 z-[1] pointer-events-none">
          <FsuVesselIllustration className="mx-auto w-full min-w-[720px] max-w-[1400px] h-auto opacity-90" />
        </div>
      </div>

      {/* Floating Login Card */}
      <div className="relative z-10 w-full max-w-[440px] px-4 py-8 sm:px-6 anim-fade-up">
        <div className="bg-white rounded-2xl p-7 sm:p-8 shadow-2xl border border-white/90 text-[#1E293B]">
          {/* Brand Header — Distribusi Gas & ORF */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/regas-.png"
                alt="Pertamina Nusantara Regas"
                className="h-12 w-auto object-contain"
              />
            </div>

            <h1 className="text-lg sm:text-xl font-black tracking-tight text-[#0B3568] leading-tight">
              Distribusi Gas &amp; ORF
            </h1>
            <p className="text-[10px] font-black text-[#1769AA] tracking-widest uppercase mt-1">
              Operational Workforce &amp; Shift Management
            </p>
            <div className="h-px w-16 bg-[#DCE5EF] my-3.5" />
            <p className="text-xs text-[#64748B] mt-0 leading-relaxed font-medium">
              Masuk untuk mengakses panel operasional Anda
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="anim-fade mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2.5"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            {/* Username */}
            <div className="anim-fade-up stagger-1">
              <label
                htmlFor="login-username"
                className="text-xs font-bold text-[#1E293B] block mb-1"
              >
                Username <span className="text-[#E1251B]">*</span>
              </label>
              <div className="relative">
                <UserIcon className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                <input
                  id="login-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#CBD7E6] rounded-xl text-[#1E293B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA] transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="anim-fade-up stagger-2">
              <label
                htmlFor="login-password"
                className="text-xs font-bold text-[#1E293B] block mb-1"
              >
                Password *
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-2.5 text-sm bg-white border border-[#CBD7E6] rounded-xl text-[#1E293B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1769AA]/20 focus:border-[#1769AA] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Big Blue MASUK Button */}
            <button
              type="submit"
              disabled={loading}
              className="anim-fade-up stagger-4 w-full py-3 px-4 rounded-xl bg-[#0B3568] hover:bg-[#082B57] text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-[#0B3568]/20 transition-all duration-150 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>MEMVERIFIKASI...</span>
                </>
              ) : (
                <>
                  <span>Masuk</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Notice */}
          <div className="mt-4 text-center text-[10px] text-[#64748B] font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Akses dibatasi hanya untuk personel dan manajemen yang berwenang.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
