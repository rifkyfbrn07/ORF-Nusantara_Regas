'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

/**
 * Opening / Preloader animation — clean white background, logo Regas centered,
 * elegant segmented loading indicator (red/blue accent), then fade out.
 * Total ~1.5s. Supports prefers-reduced-motion.
 */
export function Preloader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    const start = setTimeout(() => {
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setReducedMotion(reduced);

      if (reduced) {
        // Reduced motion: quick, calm fade — no staged movement
        setProgress(100);
        timers.push(setTimeout(() => setFading(true), 300));
        timers.push(setTimeout(() => setVisible(false), 800));
        return;
      }

      // Animate progress segments (0 → 100 over ~1.2s)
      timers.push(setTimeout(() => setProgress(35), 300));
      timers.push(setTimeout(() => setProgress(65), 650));
      timers.push(setTimeout(() => setProgress(100), 1000));

      // Fade out at ~1.4s, remove from DOM at ~1.7s
      timers.push(setTimeout(() => setFading(true), 1400));
      timers.push(setTimeout(() => setVisible(false), 1700));
    }, 0);

    return () => {
      clearTimeout(start);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#FFFFFF' }}
      aria-hidden={fading}
      aria-busy="true"
      role="status"
      aria-label="Memuat aplikasi Distribusi Gas & ORF"
    >
      {/* Subtle top accent line */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E1251B] via-[#0072CE] to-[#83B81A] opacity-80" />

      {/* Logo Regas centered */}
      <div className="relative flex flex-col items-center justify-center px-6">
        <div
          className={`relative flex items-center justify-center p-4 transition-all duration-500 ease-out ${
            reducedMotion ? 'opacity-100 scale-100' : 'opacity-95 scale-95'
          }`}
        >
          <Image
            src="/regas-.png"
            alt="Pertamina Nusantara Regas"
            width={280}
            height={88}
            priority
            className="h-auto w-52 object-contain sm:w-64 md:w-72"
          />
        </div>

        {/* Elegant segmented loading indicator */}
        <div className="mt-6 flex w-56 items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => {
            const threshold = (i + 1) * 20;
            const active = progress >= threshold;
            const partial = !active && progress >= threshold - 20;
            const pct = partial ? (progress - (threshold - 20)) / 20 : active ? 1 : 0;
            return (
              <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#E1251B] to-[#0072CE] transition-all duration-300"
                  style={{ width: `${Math.round(pct * 100)}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Branding text */}
        <div className="mt-4 text-center">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#0B3568]">
            Distribusi Gas &amp; ORF
          </div>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Operational Workforce &amp; Shift Management
          </p>
        </div>
      </div>
    </div>
  );
}
