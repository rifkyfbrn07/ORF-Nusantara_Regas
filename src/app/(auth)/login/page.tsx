'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck, UserCheck } from 'lucide-react';
import { loginAction } from '@/server/actions/authActions';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginAction({ email, password });
      if (!res.success) {
        setError(res.error || 'Login gagal. Periksa email dan kata sandi Anda.');
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

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center lg:justify-end overflow-hidden bg-[#0B3568]">
      {/* Full-screen Industrial Facility Background with Pertamina Field Operators */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/regas-fieldops-hero.png"
          alt="Pertamina Nusantara Regas — Industrial Facility & Field Operators"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center lg:object-left"
          quality={95}
        />
        {/* Cinematic gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-[#0B3568]/40 hidden lg:block" />
        <div className="absolute inset-0 bg-[#0B3568]/60 backdrop-blur-[2px] lg:hidden" />
      </div>

      {/* Floating White Login Card Container (Matching Mockup 1:1) */}
      <div className="relative z-10 w-full max-w-[460px] px-4 py-8 sm:px-6 lg:mr-16 xl:mr-24 anim-fade-up">
        <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-2xl border border-white/80 text-[#1E293B]">
          {/* Pertamina Flame Logo Header */}
          <div className="flex flex-col items-center text-center">
            <div className="relative w-32 h-10 mb-1 flex items-center justify-center">
              <Image
                src="/images/regas-.png"
                alt="Pertamina Nusantara Regas"
                width={120}
                height={36}
                className="max-h-9 w-auto object-contain"
                priority
              />
            </div>

            <span className="text-[10px] font-black text-[#1769AA] tracking-widest uppercase mb-3">
              REGAS FIELDOPS
            </span>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0B3568]">
              Masuk ke FIELDOPS
            </h1>
            <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed max-w-xs font-medium">
              Pertamina Nusantara Regas • Operator Workforce &amp; Shift Management Platform
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
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Email Field */}
            <div className="anim-fade-up stagger-1">
              <label
                htmlFor="login-email"
                className="text-xs font-bold text-[#1E293B] block mb-1"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@fieldops.local"
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
                Kata Sandi
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

            {/* Remember Me & Forgot Password */}
            <div className="anim-fade-up stagger-3 flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#64748B] hover:text-[#1E293B] font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#CBD7E6] text-[#0B3568] focus:ring-[#0B3568]/30 transition"
                />
                <span>Ingat saya</span>
              </label>

              <span className="text-[#1769AA] font-semibold text-xs cursor-pointer hover:underline">
                Lupa password?
              </span>
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
                  <span>MASUK</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="anim-fade-up stagger-5 mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-[#1769AA]" /> Akun Uji Coba Cepat
              </span>
              <span className="text-[10px] text-slate-400">Admin/Manager/Operator</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@fieldops.local', 'Admin123!')}
                className="py-1.5 px-2 bg-purple-50/60 hover:bg-purple-100/70 border border-purple-200/80 rounded-lg text-[11px] font-bold text-purple-800 transition text-center cursor-pointer"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('manager@fieldops.local', 'Manager123!')}
                className="py-1.5 px-2 bg-blue-50/60 hover:bg-blue-100/70 border border-blue-200/80 rounded-lg text-[11px] font-bold text-[#0B3568] transition text-center cursor-pointer"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('operator1@fieldops.local', 'Operator123!')}
                className="py-1.5 px-2 bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-200/80 rounded-lg text-[11px] font-bold text-emerald-800 transition text-center cursor-pointer"
              >
                Operator
              </button>
            </div>
          </div>

          {/* Footer Notice matching Mockup */}
          <div className="mt-4 text-center text-[10px] text-[#64748B] font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Akses dibatasi hanya untuk personel dan manajemen yang berwenang.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
