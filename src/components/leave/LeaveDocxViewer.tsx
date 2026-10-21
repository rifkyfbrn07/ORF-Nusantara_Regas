'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, Printer, AlertTriangle, Loader2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface LeaveDocxViewerProps {
  open: boolean;
  onClose: () => void;
  requestId: string;
  /** Status request: PENDING / APPROVED / REJECTED */
  status: string;
  /** Label status tampilan (mis. "Menunggu Reviewer", "Disetujui"). */
  statusLabel?: string;
}

/**
 * Pratinjau dokumen Formulir Permohonan Cuti (.docx) yang dirender langsung
 * dari berkas template asli, plus unduhan DOCX dan Cetak/Simpan PDF.
 *
 * Aturan PDF:
 * - Draft / pratinjau tersedia untuk semua status (termasuk PENDING).
 * - PDF FINAL hanya tersedia setelah status APPROVED
 *   (alur Reviewer → Team Lead → Manager sudah selesai).
 *
 * Catatan teknis: konversi DOCX -> PDF di server (LibreOffice/soffice) tidak
 * tersedia pada lingkungan ini, sehingga PDF dihasilkan lewat dialog cetak
 * browser dari rendering DOCX yang setia terhadap template.
 */
export function LeaveDocxViewer({
  open,
  onClose,
  requestId,
  status,
  statusLabel,
}: LeaveDocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFinal = status === 'APPROVED';

  const docUrl = `/api/export/leave-docx?requestId=${encodeURIComponent(requestId)}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const container = containerRef.current;

    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(docUrl);
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || 'Gagal memuat dokumen cuti.');
        }
        const buf = await res.arrayBuffer();
        if (cancelled || !container) return;

        const { renderAsync } = await import('docx-preview');
        if (cancelled || !container) return;

        container.innerHTML = '';
        await renderAsync(buf, container, undefined, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
        });
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal merender pratinjau dokumen.');
          setLoading(false);
        }
      }
    };

    void loadDocument();

    return () => {
      cancelled = true;
      if (container) container.innerHTML = '';
    };
  }, [open, docUrl]);

  /**
   * Cetak / Simpan sebagai PDF: konten dokumen disalin ke host cetak khusus
   * di root body agar hanya dokumen yang ikut tercetak.
   */
  const handlePrint = () => {
    const source = containerRef.current;
    if (!source || !source.innerHTML.trim()) return;

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
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        background: #fff;
        z-index: 99999;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      #leave-docx-print-host .docx-wrapper {
        background: #fff !important;
        padding: 0 !important;
      }
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pratinjau Formulir Permohonan Cuti"
      eyebrow="PT PERMATA KARYA JASA - ORF NUSANTARA REGAS"
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            <StatusBadge
              status={status}
              label={statusLabel || (isFinal ? 'Evidence Final' : 'Draft / Belum Final')}
              size="md"
            />
            {!isFinal && (
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                PDF DRAFT tersedia — FINAL hanya setelah approval Manager.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={docUrl}
              className="px-4 py-2 rounded-xl bg-[#0B3568] hover:bg-[#092B57] dark:bg-[#0284C7] dark:hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-1.5 transition"
              title="Unduh dokumen Formulir Permohonan Cuti (.docx)"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Unduh DOCX</span>
            </a>
            <button
              type="button"
              disabled={loading}
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={
                isFinal
                  ? 'Cetak / Simpan sebagai PDF FINAL melalui dialog cetak browser (persetujuan lengkap)'
                  : 'Cetak / Simpan sebagai PDF DRAFT melalui dialog cetak browser (belum disetujui final)'
              }
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{isFinal ? 'Cetak / Simpan PDF (Final)' : 'Cetak / Simpan PDF (Draft)'}</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title={
                isFinal
                  ? 'Unduh dokumen PDF FINAL (persetujuan Reviewer → Team Lead → Manager lengkap)'
                  : 'Unduh dokumen PDF DRAFT (belum disetujui final)'
              }
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{isFinal ? 'Unduh PDF (Final)' : 'Unduh PDF (Draft)'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5 inline -mt-0.5 mr-1" />
              Tutup
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {!isFinal && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold rounded-xl flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Dokumen ini masih <strong>DRAFT</strong> — bagian persetujuan akan diisi sesuai data
              approval yang benar-benar tersimpan. Jangan dianggap sebagai formulir yang sudah
              disetujui.
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-900 overflow-auto max-h-[65vh] p-4">
          {loading && (
            <div className="p-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-[#0B3568] dark:text-[#38BDF8]" />
              <span>Memuat pratinjau dokumen resmi...</span>
            </div>
          )}
          <div ref={containerRef} className={loading ? 'hidden' : ''} />
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Dokumen dirender dari template resmi PT Permata Karya Jasa (.docx). Gunakan opsi
          &quot;Cetak / Simpan PDF&quot; atau &quot;Unduh PDF&quot; untuk menghasilkan PDF via dialog
          cetak browser. PDF FINAL hanya tersedia setelah pengajuan disetujui oleh Manager.
        </p>
      </div>
    </Modal>
  );
}
