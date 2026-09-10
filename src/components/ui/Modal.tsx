'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  bodyClassName?: string;
  closeOnBackdrop?: boolean;
}

const SIZE_CLASS: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl',
};

/**
 * Universal Modal component for all forms & popups:
 * - Locks background/page scroll completely (without layout shift).
 * - Fixed/sticky Header with title and close button.
 * - Scrollable Body with max-height aware sizing (only body scrolls).
 * - Fixed/sticky Footer with primary/cancel actions.
 * - Centered on desktop & mobile, top-up popup feel.
 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  size = 'md',
  bodyClassName,
  closeOnBackdrop = true,
}: ModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);

    // Lock page scroll cleanly
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-hidden select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={clsx(
          'bg-white w-full rounded-2xl border border-slate-200/90 shadow-2xl flex flex-col max-h-[min(90vh,calc(100dvh-2rem))] overflow-hidden select-text anim-fade-up',
          SIZE_CLASS[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[10px] font-black tracking-wider uppercase text-[#1769AA]">
                {eyebrow}
              </div>
            )}
            <h3 className="text-sm sm:text-base font-black text-[#0B3568] leading-snug truncate">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer shrink-0 transition"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          ref={bodyRef}
          className={clsx(
            'px-5 py-4 overflow-y-auto grow min-h-0 text-slate-700 text-xs sm:text-sm',
            bodyClassName
          )}
        >
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
