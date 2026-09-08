'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  bodyClassName?: string;
}

const SIZE_CLASS: Record<string, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-3xl',
};

/**
 * Modal responsif & konsisten untuk seluruh aplikasi:
 * - Desktop: centered; Mobile: hampir full width dengan margin kecil.
 * - Body scrollable dengan max-height viewport; header & footer sticky.
 * - ESC menutup (aman), backdrop click menutup, body scroll lock.
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
}: ModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 overflow-y-auto bg-black/45"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={clsx(
          'bg-white w-full rounded-t-2xl sm:rounded-2xl border border-[#DCE5EF] shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh] anim-fade-up',
          SIZE_CLASS[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#EDF2F7] shrink-0 rounded-t-2xl bg-white">
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[10px] font-black tracking-wider uppercase text-[#1769AA]">
                {eyebrow}
              </div>
            )}
            <h3 className="text-sm sm:text-base font-black text-[#092B57] leading-snug">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer shrink-0"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          ref={bodyRef}
          className={clsx('px-5 py-4 overflow-y-auto grow min-h-0', bodyClassName)}
        >
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-[#EDF2F7] bg-white rounded-b-2xl shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
