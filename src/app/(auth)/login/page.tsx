'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, User as UserIcon, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
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
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-[#F0F6FD] text-[#0F315A] select-none">
      {/* 1. ATMOSPHERIC BACKGROUND (Terminal LNG + FSRU + Orbital Arcs + Floating Nodes) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Plant Background & FSRU */}
        <div className="absolute inset-0 opacity-40 mix-blend-multiply">
          <Image
            src="/Background.svg"
            alt="Terminal LNG & FSRU Jawa Barat"
            fill
            className="object-cover object-center"
            priority
          />
        </div>

        {/* Soft Radial Center Vignette */}
        <div className="absolute inset-0 bg-radial from-white via-white/85 to-[#E0ECF8]/90" />

        {/* FSRU Vessel Silhouette on Right */}
        <div className="absolute bottom-12 right-0 left-0 z-[1] opacity-25">
          <FsuVesselIllustration className="w-full min-w-[900px] h-auto ml-auto" />
        </div>

        {/* Concentric Orbital Arcs (Preloader & Login Signature Identity) */}
        <svg
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] sm:w-[1400px] h-[1100px] sm:h-[1400px] opacity-75"
          viewBox="0 0 1400 1400"
          fill="none"
        >
          {/* Outer Orbit */}
          <circle cx="700" cy="700" r="620" stroke="#0088D8" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="6 8" />
          {/* Mid Orbit 1 */}
          <circle cx="700" cy="700" r="480" stroke="#0088D8" strokeOpacity="0.15" strokeWidth="1.2" />
          {/* Mid Orbit 2 */}
          <circle cx="700" cy="700" r="340" stroke="#69BE28" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="4 6" />
          {/* Inner Orbit */}
          <circle cx="700" cy="700" r="220" stroke="#E5242A" strokeOpacity="0.12" strokeWidth="1" />

          {/* Floating Color Nodes on Orbit */}
          <circle cx="350" cy="200" r="6" fill="#E5242A" />
          <circle cx="1100" cy="260" r="6.5" fill="#0088D8" />
          <circle cx="1280" cy="700" r="5" fill="#69BE28" />
        </svg>

        {/* Decorative Geometric Corner Pills */}
        <div className="hidden lg:block absolute left-6 top-1/3 w-10 h-28 rounded-full border-2 border-[#0088D8] opacity-80" />
        <div className="hidden lg:block absolute left-10 top-[45%] w-8 h-20 rounded-full border-2 border-[#E5242A] opacity-80" />
        <div className="hidden lg:block absolute right-6 top-1/3 w-10 h-28 rounded-full border-2 border-[#0088D8] opacity-80" />
        <div className="hidden lg:block absolute right-10 top-[45%] w-8 h-20 rounded-full border-2 border-[#E5242A] opacity-80" />
      </div>

      {/* 2. TOP BRANDING HEADER */}
      <header className="relative z-10 w-full px-6 sm:px-12 pt-6 sm:pt-8 flex items-center justify-between">
        {/* Top-Left: Energy slogan */}
        <div className="flex items-center gap-3">
          <div className="w-1 h-9 rounded-full bg-[#0088D8]" />
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#0F315A] leading-tight">
            Energy<br />for a brighter<br />tomorrow
          </div>
        </div>

        {/* Top-Center: Pertamina Logo */}
        <div className="flex flex-col items-center">
          <Image
            src="/images/regas-.png"
            alt="Pertamina Nusantara Regas"
            width={180}
            height={48}
            className="h-10 sm:h-12 w-auto object-contain"
            priority
          />
        </div>

        {/* Top-Right: Corporate Name */}
        <div className="hidden sm:flex flex-col items-end text-right">
          <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-[#0F315A]">
            Pertamina<br />Nusantara Regas
          </div>
          <div className="w-8 h-0.5 bg-[#0088D8] mt-1" />
        </div>
      </header>

      {/* 3. CENTER FLOATING LOGIN CARD */}
      <main className="relative z-10 w-full max-w-[460px] mx-auto px-4 py-6 sm:py-8 anim-fade-up">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-7 sm:p-9 shadow-[0_20px_60px_rgba(15,49,90,0.12),0_2px_8px_rgba(15,49,90,0.04)] border border-white text-[#0F315A]">
          {/* Card Top: 3-Segment Slanted Accent Badge */}
          <div className="flex justify-center gap-1.5 mb-3">
            <span className="w-7 h-2.5 rounded-xs bg-[#0088D8] transform -skew-x-25 shadow-2xs" />
            <span className="w-7 h-2.5 rounded-xs bg-[#69BE28] transform -skew-x-25 shadow-2xs" />
            <span className="w-7 h-2.5 rounded-xs bg-[#E5242A] transform -skew-x-25 shadow-2xs" />
          </div>

          {/* Heading */}
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-widest uppercase text-[#0B3568]">
              L O G I N
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#1769AA] mt-1">
              SISTEM OPERASIONAL
            </p>
            <p className="text-[8.5px] font-bold uppercase tracking-[0.3em] text-[#64748B] mt-0.5">
              DISTRIBUSI GAS &amp; ORF
            </p>

            {/* Thin 3-color rainbow underline */}
            <div className="flex justify-center my-3">
              <div className="w-20 h-0.5 bg-gradient-to-r from-[#0088D8] via-[#69BE28] to-[#E5242A] rounded-full" />
            </div>

            <p className="text-xs text-[#64748B] font-medium mt-1">
              Masuk untuk mengakses panel operasional Anda
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="anim-fade mt-4 p-3 bg-red-50 border border-red-200 text-[#E5242A] text-xs font-semibold rounded-xl flex items-center gap-2.5"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-[#E5242A]" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Username Input */}
            <div>
              <label
                htmlFor="login-username"
                className="text-xs font-bold text-[#0F315A] block mb-1"
              >
                Username <span className="text-[#E5242A]">*</span>
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
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F8FAFC] border border-[#D0DFEF] rounded-xl text-[#0F315A] placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0088D8]/25 focus:border-[#0088D8] transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="login-password"
                className="text-xs font-bold text-[#0F315A] block mb-1"
              >
                Password <span className="text-[#E5242A]">*</span>
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
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-11 py-2.5 text-sm bg-[#F8FAFC] border border-[#D0DFEF] rounded-xl text-[#0F315A] placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0088D8]/25 focus:border-[#0088D8] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Vibrant Pertamina Blue Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#0088D8] hover:bg-[#0074dc] text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-md shadow-[#0088D8]/25 transition-all duration-150 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 cursor-pointer mt-3"
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

          {/* Security Badge */}
          <div className="mt-5 text-center text-[10.5px] text-[#5F718A] font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#69BE28] shrink-0" />
            <span>Akses dibatasi hanya untuk personel dan manajemen yang berwenang.</span>
          </div>
        </div>
      </main>

      {/* 4. BOTTOM FOOTER BRANDING */}
      <footer className="relative z-10 w-full px-6 sm:px-12 pb-6 sm:pb-8 flex items-center justify-between text-[10px] font-extrabold tracking-widest uppercase text-[#0F315A]">
        {/* Bottom-Left: 3-Color Slanted Segments + Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1">
            <span className="w-3.5 h-1.5 rounded-xs bg-[#0088D8] transform -skew-x-25" />
            <span className="w-3.5 h-1.5 rounded-xs bg-[#69BE28] transform -skew-x-25" />
            <span className="w-3.5 h-1.5 rounded-xs bg-[#E5242A] transform -skew-x-25" />
          </div>
          <div className="w-8 h-px bg-[#0F315A]/30" />
          <span>Pertamina Nusantara Regas</span>
        </div>

        {/* Bottom-Right: Corporate Pillars */}
        <div className="flex items-center gap-2 tracking-[0.2em] text-[#0F315A]/80">
          <span>Reliable</span>
          <span>•</span>
          <span>Safe</span>
          <span>•</span>
          <span>Sustainable</span>
        </div>
      </footer>
    </div>
  );
}
