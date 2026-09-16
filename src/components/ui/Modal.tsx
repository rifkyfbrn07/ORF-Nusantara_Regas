'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export interface ModalProps {
  open: boolean;
  /** Dipanggil saat user menutup modal (Escape / backdrop bila diizinkan). */
  onClose: () => void;
  title: string;
  eyebrow?: string;
  /** Konten body — SATU-SATUNYA area yang boleh scroll. */
  children: React.ReactNode;
  /** Footer sticky di luar area scroll — tombol Simpan tidak pernah ikut scroll. */
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  bodyClassName?: string;
  closeOnBackdrop?: boolean;
}

const SIZE_CLASS: Record<string, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
  '2xl': 'sm:max-w-4xl',
};

let openModalCount = 0;
let savedBodyOverflow = '';
let savedBodyPaddingRight = '';
let savedDocumentOverflow = '';

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
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const panelId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);

    // Lock both potential scrolling roots. The shared counter keeps nested dialogs safe.
    if (openModalCount === 0) {
      savedBodyOverflow = document.body.style.overflow;
      savedBodyPaddingRight = document.body.style.paddingRight;
      savedDocumentOverflow = document.documentElement.style.overflow;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    openModalCount += 1;

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKey);
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.overflow = savedBodyOverflow;
        document.body.style.paddingRight = savedBodyPaddingRight;
        document.documentElement.style.overflow = savedDocumentOverflow;
      }
      restoreFocusRef.current?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [open]);

  // Saat validation error muncul di dalam body, scroll body agar error terlihat
  // (tanpa mengubah ukuran modal (ini berlaku untuk SEMUA form dalam Modal). (perubahan children = re-render)
  const errorSeen = useRef(false);
  useEffect(() => {
    const body = bodyRef.current;
    if (!open || !body) return;
    const alert = body.querySelector('[role="alert"], [aria-invalid="true"]');
    const hasError = Boolean(alert);
    if (hasError && !errorSeen.current && alert instanceof HTMLElement) {
      alert.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    errorSeen.current = hasError;
  }, [open, children]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-slate-950/45 dark:bg-[rgba(2,10,18,0.72)] p-2.5 backdrop-blur-[2px] overscroll-contain select-none animate-in fade-in duration-200 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={panelId}
      aria-label={title}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        id={panelId}
        ref={panelRef}
        className={clsx(
          'flex w-full max-w-full flex-col overflow-hidden rounded-xl border border-surface-border dark:border-[rgba(120,190,235,0.18)] bg-surface-3 dark:bg-[#0D263E] text-text-secondary dark:text-[#B6C9D9] shadow-2xl select-text anim-fade-up max-h-[calc(100dvh-1.25rem)] sm:max-h-[min(92dvh,calc(100dvh-2rem))]',
          SIZE_CLASS[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header — tidak pernah ikut scroll */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-surface-border dark:border-[rgba(120,190,235,0.18)] bg-surface-3 dark:bg-[#0D263E] shrink-0">
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[10px] font-black tracking-wider uppercase text-[#1769AA] dark:text-[#4DB8F5]">
                {eyebrow}
              </div>
            )}
            <h3 className="text-sm sm:text-base font-black text-text-primary dark:text-[#F5FAFF] leading-snug truncate">
              {title}
            </h3>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted dark:text-[#8EA7BD] hover:bg-surface-1 dark:hover:bg-[#12314D] hover:text-text-primary dark:hover:text-[#F5FAFF] cursor-pointer shrink-0 transition"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body — satu-satunya area yang scroll; overscroll di-contain */}
        <div
          ref={bodyRef}
          className={clsx(
            'px-5 py-4 overflow-y-auto grow min-h-0 overscroll-contain text-text-secondary dark:text-[#B6C9D9] text-xs sm:text-sm [scrollbar-gutter:stable]',
            bodyClassName
          )}
        >
          {children}
        </div>

        {/* Sticky Footer — tidak pernah ikut scroll */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-surface-border dark:border-[rgba(120,190,235,0.18)] bg-surface-1 dark:bg-[#0A2035] shrink-0 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  , document.body);
}
