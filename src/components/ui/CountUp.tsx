'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  /** Total animation duration in ms (kept short & professional). */
  duration?: number;
  className?: string;
}

/**
 * Lightweight number count-up (requestAnimationFrame, cubic ease-out).
 * Respects prefers-reduced-motion by rendering the final value instantly.
 */
export function CountUp({ value, duration = 450, className }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Wrap even the instant path in rAF so state updates stay outside the effect body
    if (reduceMotion) {
      const id = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(id);
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic — professional, no bounce
      setDisplay(Math.round(value * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
