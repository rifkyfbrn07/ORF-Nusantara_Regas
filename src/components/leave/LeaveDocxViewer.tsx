'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileText, Printer, AlertTriangle, Loader2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface LeaveDocxViewerProps {
  open: boolean;
  onClose: () => void;
  requestId: string;
  status: string;
  statusLabel?: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer = 0;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => window.clearTimeout(timer));
}

export function LeaveDocxViewer({
  open,
  onClose,
  requestId,
  status,
  statusLabel,
}: LeaveDocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerReady, setContainerReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documentReady, setDocumentReady] = useState(false);
  const [documentStatus, setDocumentStatus] = useState<'DRAFT' | 'FINAL'>('DRAFT');
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const docUrl = `/api/export/leave-docx?requestId=${encodeURIComponent(requestId)}`;
  const isFinal = documentReady && documentStatus === 'FINAL';

  // Modal mounts its portal after its first effect. Wait for the portal child ref
  // before starting the fetch so the first request cannot exit with a null target.
  const attachContainer = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
    if (element) setContainerReady(true);
  }, []);

  useEffect(() => {
    if (!open || !containerReady) return;
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const controller = new AbortController();
    const fetchTimer = window.setTimeout(() => controller.abort(), 25_000);
    setLoading(true);
    setDocumentReady(false);
    setError(null);
    container.replaceChildren();

    const loadDocument = async () => {
      try {
        const response = await fetch(docUrl, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || 'Gagal memuat dokumen cuti.');
        }
        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const { renderAsync } = await import('docx-preview');
        const renderedDocument = document.createElement('div');
        await withTimeout(
          renderAsync(buffer, renderedDocument, undefined, {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            ignoreLastRenderedPageBreak: true,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
          }),
          25_000,
          'Rendering dokumen melewati batas waktu. Coba lagi.',
        );
        if (cancelled) return;

        container.replaceChildren(...Array.from(renderedDocument.childNodes));
        setDocumentStatus(response.headers.get('X-Document-Status') === 'FINAL' ? 'FINAL' : 'DRAFT');
        setDocumentReady(true);
      } catch (cause) {
        if (!cancelled) {
          const message = cause instanceof DOMException && cause.name === 'AbortError'
            ? 'Waktu tunggu pengambilan dokumen habis. Periksa koneksi lalu coba lagi.'
            : cause instanceof Error ? cause.message : 'Gagal merender pratinjau dokumen.';
          setError(message);
        }
      } finally {
        window.clearTimeout(fetchTimer);
        if (!cancelled) setLoading(false);
      }
    };

    void loadDocument();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(fetchTimer);
      container.replaceChildren();
    };
  }, [open, containerReady, docUrl, retryKey]);

  const handlePrint = () => {
    const source = containerRef.current;
    if (!documentReady || !source || !source.innerHTML.trim()) return;

    const host = document.createElement('div');
    host.id = 'leave-docx-print-host';
    host.innerHTML = source.innerHTML;
    const style = document.createElement('style');
    style.id = 'leave-docx-print-style';
    style.textContent = `
      @media print {
        body > *:not(#leave-docx-print-host) { display: none !important; }
        #leave-docx-print-host { display: block !important; }
      }
      body > #leave-docx-print-host {
        position: absolute; left: 0; top: 0; width: 100%; background: #fff;
        z-index: 99999; -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      #leave-docx-print-host .docx-wrapper { background: #fff !important; padding: 0 !important; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(host);
    try {
      window.print();
    } finally {
      host.remove();
      style.remove();
    }
  };

  const retryLoad = () => {
    setError(null);
    setRetryKey((current) => current + 1);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pratinjau Formulir Permohonan Cuti"
      eyebrow="PT PERMATA KARYA JASA - ORF NUSANTARA REGAS"
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusBadge
              status={isFinal ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : 'PENDING'}
              label={isFinal ? 'FINAL' : statusLabel ? `DRAFT · ${statusLabel}` : 'DRAFT'}
              size="md"
            />
            {!isFinal && (
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                PDF DRAFT tersedia. Dokumen FINAL hanya setelah persetujuan Manager.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={docUrl}
              className="flex items-center gap-1.5 rounded-xl bg-[#0B3568] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#092B57] dark:bg-[#0284C7] dark:hover:bg-[#0369A1]"
              title="Unduh dokumen Formulir Permohonan Cuti (.docx)"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Unduh DOCX {isFinal ? 'Final' : 'Draft'}</span>
            </a>
            <button
              type="button"
              disabled={!documentReady || loading}
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              title="Buka dialog cetak untuk mencetak atau menyimpan dokumen sebagai PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak / Simpan PDF {isFinal ? 'Final' : 'Draft'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X className="mr-1 inline h-3.5 w-3.5" />
              Tutup
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {!isFinal && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Dokumen ini masih <strong>DRAFT</strong>. Bagian persetujuan menampilkan data yang benar-benar tersimpan dan tahap yang belum diproses; jangan dianggap sebagai formulir final.
            </span>
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</span>
            <button type="button" onClick={retryLoad} className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 font-bold hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/40">
              Coba lagi
            </button>
          </div>
        )}

        <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-4 dark:border-slate-700 dark:bg-slate-900">
          {loading && (
            <div role="status" className="flex flex-col items-center justify-center gap-2 p-8 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-[#0B3568] dark:text-[#38BDF8]" />
              <span>Memuat pratinjau dokumen resmi...</span>
            </div>
          )}
          <div ref={attachContainer} className={documentReady ? '' : 'hidden'} />
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <FileText className="h-3.5 w-3.5" />
          Dokumen dirender dari template resmi PT Permata Karya Jasa (.docx). Simpan sebagai PDF melalui dialog cetak browser.
        </p>
      </div>
    </Modal>
  );
}
