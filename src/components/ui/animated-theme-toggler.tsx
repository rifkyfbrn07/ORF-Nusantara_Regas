'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

export function AnimatedThemeToggler() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Aktifkan Light Mode' : 'Aktifkan Dark Mode'}
      title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-[#0F315A] shadow-xs transition hover:-translate-y-0.5 hover:border-[#0066B3] hover:text-[#0066B3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066B3]/40 motion-reduce:transition-none"
    >
      <span className="sr-only">Ganti tema</span>
      <Sun className={`absolute h-4 w-4 transition-all duration-300 motion-reduce:duration-0 ${theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
      <Moon className={`absolute h-4 w-4 transition-all duration-300 motion-reduce:duration-0 ${theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
    </button>
  );
}
