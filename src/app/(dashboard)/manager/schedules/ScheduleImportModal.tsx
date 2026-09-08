'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { FileUp, Download, Loader2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { validateImportAction, confirmImportAction } from '@/server/actions/scheduleBulkActions';

export interface ImportRow {
  row: number;
  tanggal: string;
  username?: string;
  nama?: string;
  employeeId?: string;
  shift: string;
  status?: string;
  catatan?: string;
}

interface ImportRowResult {
  row: number;
  ok: boolean;
  message: string;
  date?: string;
  userName?: string;
  shift?: string;
}

const TEMPLATE_ROWS = [
  { Tanggal: '2026-09-10', Username: 'andi.pratama', Nama: 'Andi Pratama', 'Employee ID': 'OP-001', Shift: 'Pg', Status: 'WORK', Catatan: '' },
  { Tanggal: '2026-09-10', Username: 'budi.santoso', Nama: 'Budi Santoso', 'Employee ID': 'OP-002', Shift: 'Mlm', Status: 'WORK', Catatan: '' },
  { Tanggal: '2026-09-11', Username: 'citra.dewi', Nama: 'Citra Dewi', 'Employee ID': 'OP-003', Shift: 'Off', Status: 'OFF', Catatan: 'Libur rutin' },
];

function downloadTemplate() {
  const ws = XLSX.utils.json_to_sheet(TEMPLATE_ROWS);
  ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Jadwal');
  XLSX.writeFile(wb, 'template-import-jadwal.xlsx');
}

function toIsoDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const d = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return String(value ?? '').trim();
}

export function ScheduleImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportRowResult[] | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; updated: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRows([]);
    setFileName(null);
    setPreview(null);
    setImportResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleFile(file: File) {
    setError(null);
    setPreview(null);
    setImportResult(null);
    if (!file.name.match(/\.xlsx$/i)) {
      setError('Format file harus .xlsx');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5 MB.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        const parsed: ImportRow[] = raw
          .map((r, idx) => ({
            row: idx + 2,
            tanggal: toIsoDate(r['Tanggal'] ?? r['tanggal'] ?? r['Date']),
            username: String(r['Username'] ?? r['username'] ?? '').trim() || undefined,
            nama: String(r['Nama'] ?? r['nama'] ?? '').trim() || undefined,
            employeeId: String(r['Employee ID'] ?? r['employeeId'] ?? '').trim() || undefined,
            shift: String(r['Shift'] ?? r['shift'] ?? '').trim(),
            status: String(r['Status'] ?? r['status'] ?? '').trim() || undefined,
            catatan: String(r['Catatan'] ?? r['catatan'] ?? '').trim() || undefined,
          }))
          .filter((r) => r.tanggal || r.username || r.nama || r.shift);
        if (parsed.length === 0) {
          setError('File tidak berisi data. Gunakan template yang tersedia.');
          return;
        }
        setRows(parsed);
      } catch {
        setError('Gagal membaca file Excel. Pastikan format benar.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleValidate() {
    setError(null);
    setLoading(true);
    try {
      const res = await validateImportAction(rows);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setPreview(res.results);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    try {
      const res = await confirmImportAction(rows);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setImportResult({ created: res.created, updated: res.updated });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const validCount = preview ? preview.filter((r) => r.ok).length : 0;
  const invalidRows = preview ? preview.filter((r) => !r.ok) : [];

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      size="lg"
      eyebrow="IMPORT SCHEDULE"
      title="Import Jadwal dari Excel"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-[#CBD7E6] text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Download Template Excel
          </button>
          {preview && !importResult ? (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || validCount === 0}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#123B6D] text-white hover:bg-[#0F315A] disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Import {validCount} Baris Valid
            </button>
          ) : !importResult ? (
            <button
              type="button"
              onClick={handleValidate}
              disabled={loading || rows.length === 0}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0066B3] text-white hover:bg-[#0F315A] disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Validasi & Preview
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
            >
              Selesai
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Instruksi format */}
        <div className="rounded-xl border border-[#E2E8F0] bg-[#FBFDFE] p-3 text-[11px] text-slate-600 space-y-1">
          <p className="font-bold text-[#0B3568]">Format kolom Excel:</p>
          <p>
            <code className="font-mono text-[10px] bg-slate-100 px-1 rounded">Tanggal</code> (YYYY-MM-DD) ·{' '}
            <code className="font-mono text-[10px] bg-slate-100 px-1 rounded">Username</code> ·{' '}
            <code className="font-mono text-[10px] bg-slate-100 px-1 rounded">Nama</code> ·{' '}
            <code className="font-mono text-[10px] bg-slate-100 px-1 rounded">Employee ID</code> ·{' '}
            <code className="font-mono text-[10px] bg-slate-100 px-1 rounded">Shift</code> (Pg/Mlm/Off) ·{' '}
            <code className="font-mono text-[10px] bg-slate-100 px-1 rounded">Status</code> ·{' '}
            <code className="font-mono text-[10px] bg-slate-100 px-1 rounded">Catatan</code>
          </p>
          <p className="text-[10px] text-slate-400">
            Jadwal yang sudah ada untuk tanggal &amp; operator yang sama akan diperbarui (upsert, tanpa duplikat).
          </p>
        </div>

        {/* File picker */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-[#CBD7E6] hover:border-[#0066B3] hover:bg-[#F8FBFE] rounded-xl px-4 py-6 text-center transition cursor-pointer"
          >
            <FileUp className="h-6 w-6 mx-auto text-[#0066B3] mb-1.5" />
            <span className="block text-xs font-bold text-[#0B3568]">
              {fileName || 'Pilih file .xlsx dari device'}
            </span>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              File Excel maksimal 5 MB
            </span>
          </button>
          {rows.length > 0 && !importResult && (
            <button
              type="button"
              onClick={reset}
              className="mt-1.5 text-[10.5px] font-bold text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" /> Hapus file &amp; ulangi
            </button>
          )}
        </div>

        {/* Import result */}
        {importResult && (
          <div className="flex items-start gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Import selesai: {importResult.created} jadwal baru, {importResult.updated} diperbarui.
          </div>
        )}

        {/* Preview */}
        {preview && !importResult && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">{validCount} valid</span>
              {invalidRows.length > 0 && (
                <span className="text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">{invalidRows.length} error</span>
              )}
              <span className="text-slate-400 font-semibold">— periksa sebelum import</span>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-[#E2E8F0]">
              <table className="w-full text-left text-[10.5px]">
                <thead className="bg-[#EDF4FB] sticky top-0">
                  <tr>
                    <th className="px-2.5 py-1.5 font-black text-slate-500">Baris</th>
                    <th className="px-2.5 py-1.5 font-black text-slate-500">Tanggal</th>
                    <th className="px-2.5 py-1.5 font-black text-slate-500">Operator</th>
                    <th className="px-2.5 py-1.5 font-black text-slate-500">Shift</th>
                    <th className="px-2.5 py-1.5 font-black text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.slice(0, 100).map((r) => (
                    <tr key={r.row} className={r.ok ? '' : 'bg-red-50/60'}>
                      <td className="px-2.5 py-1.5 font-bold text-slate-400">{r.row}</td>
                      <td className="px-2.5 py-1.5 font-semibold text-slate-700">{r.date || '—'}</td>
                      <td className="px-2.5 py-1.5 font-semibold text-slate-700">{r.userName || r.message}</td>
                      <td className="px-2.5 py-1.5 font-bold text-[#0066B3]">{r.shift || '—'}</td>
                      <td className={`px-2.5 py-1.5 font-bold ${r.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                        {r.ok ? 'OK' : r.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {invalidRows.length > 0 && (
              <div className="flex items-start gap-2 text-[11px] font-semibold text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Perbaiki file lalu upload ulang. Contoh: Baris {invalidRows[0].row} — {invalidRows[0].message}
              </div>
            )}
          </div>
        )}

        {error && !preview && (
          <div className="flex items-start gap-2 text-xs font-semibold text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function ImportExcelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-lg border border-emerald-500 text-emerald-700 hover:bg-emerald-50 cursor-pointer whitespace-nowrap"
    >
      <FileUp className="h-3.5 w-3.5" /> Import Excel
    </button>
  );
}

