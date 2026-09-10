'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

export function Preloader() {
  const [phase, setPhase] = useState<number>(0); // 0: subtle, 1: red, 2: blue, 3: green, 4: full/glow, 5: fadeout, 6: done
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Defer to a callback so no state is set synchronously in the effect body.
    const start = setTimeout(() => {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Reduced motion: simple short fade, no staged animation
        setReducedMotion(true);
        setPhase(6);
        return;
      }

      // Animation timeline for full experience (1.4s total)
      timers.push(setTimeout(() => setPhase(1), 200));   // 200ms: Red reveal
      timers.push(setTimeout(() => setPhase(2), 400));   // 400ms: Blue reveal
      timers.push(setTimeout(() => setPhase(3), 600));   // 600ms: Green reveal
      timers.push(setTimeout(() => setPhase(4), 800));   // 800ms: Full color + glow
      timers.push(setTimeout(() => setPhase(5), 1200));  // 1200ms: Fade out
      timers.push(setTimeout(() => setPhase(6), 1500));  // 1500ms: Remove from DOM
    }, 0);

    return () => {
      clearTimeout(start);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (phase === 6) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 select-none ${
        phase >= 5 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#071A2E' }}
      aria-hidden={phase >= 5}
    >
      {/* 1. Fullscreen Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Background.svg"
          alt="Pertamina Nusantara Regas Background"
          className="w-full h-full object-cover object-center opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071A2E]/80 via-[#0B3568]/60 to-[#071A2E]/90" />
      </div>

      {/* 2. Central Focus: Logo Animation Container */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 max-w-sm w-full">
        {/* Dynamic Glow Halo corresponding to phase */}
        <div
          className={`absolute w-44 h-44 rounded-full blur-3xl transition-all duration-300 pointer-events-none ${
            reducedMotion
              ? 'opacity-30 bg-blue-500'
              : phase === 1
              ? 'opacity-50 bg-[#E1251B] scale-90'
              : phase === 2
              ? 'opacity-50 bg-[#0072CE] scale-100'
              : phase === 3
              ? 'opacity-50 bg-[#83B81A] scale-105'
              : phase === 4
              ? 'opacity-70 bg-gradient-to-r from-[#E1251B] via-[#0072CE] to-[#83B81A] scale-110 animate-pulse'
              : 'opacity-10 bg-blue-400 scale-75'
          }`}
        />

        {/* Logo Pertamina Regas with State Transitions */}
        <div
          className={`relative flex items-center justify-center p-4 transition-all duration-400 ease-out ${
            phase === 0
              ? 'opacity-30 scale-95 grayscale'
              : phase === 1
              ? 'opacity-70 scale-98 drop-shadow-[0_0_12px_rgba(225,37,27,0.5)]'
              : phase === 2
              ? 'opacity-85 scale-100 drop-shadow-[0_0_16px_rgba(0,114,206,0.6)]'
              : phase === 3
              ? 'opacity-95 scale-100 drop-shadow-[0_0_18px_rgba(131,184,26,0.6)]'
              : 'opacity-100 scale-100 drop-shadow-[0_0_24px_rgba(255,255,255,0.4)]'
          }`}
        >
          <Image
            src="/regas-.png"
            alt="Pertamina Nusantara Regas"
            width={240}
            height={70}
            priority
            className="w-48 sm:w-56 md:w-64 h-auto object-contain max-w-[75vw]"
          />
        </div>

        {/* Progress Color Indicator Bars */}
        {!reducedMotion && (
          <div className="flex items-center gap-1.5 mt-5 h-1 w-28 bg-white/10 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full flex-1 rounded-full transition-all duration-200 ${
                phase >= 1 ? 'bg-[#E1251B] opacity-100' : 'bg-transparent opacity-20'
              }`}
            />
            <div
              className={`h-full flex-1 rounded-full transition-all duration-200 ${
                phase >= 2 ? 'bg-[#0072CE] opacity-100' : 'bg-transparent opacity-20'
              }`}
            />
            <div
              className={`h-full flex-1 rounded-full transition-all duration-200 ${
                phase >= 3 ? 'bg-[#83B81A] opacity-100' : 'bg-transparent opacity-20'
              }`}
            />
          </div>
        )}

        {/* Subtitle / System Tag */}
        <div
          className={`text-center mt-3 transition-opacity duration-300 ${
            phase >= 2 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="text-[11px] font-black tracking-widest text-white/90 uppercase">
            Distribusi Gas &amp; ORF
          </span>
          <p className="text-[9px] font-bold text-blue-200/80 tracking-wider uppercase mt-0.5">
            Operational Workforce System
          </p>
        </div>
      </div>
    </div>
  );
}
