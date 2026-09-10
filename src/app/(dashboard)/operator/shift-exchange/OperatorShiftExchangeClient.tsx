'use client';

import React, { useState, useMemo } from 'react';
import { ArrowLeftRight, CheckCircle, AlertCircle, Send, X, ExternalLink, Search, CalendarDays, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { FileUploadProof } from '@/components/ui/FileUploadProof';
import {
  submitShiftExchangeAction,
  respondShiftExchangeAction,
  findExchangeCandidatesAction,
  getOperatorEligibleOffDaysAction,
} from '@/server/actions/shiftExchangeActions';
import { useRouter } from 'next/navigation';

export interface ShiftExchangeItem {
  id: string;
  status: string;
  reason: string;
  targetDate: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
  targetAcceptedAt?: string | Date | null;
  requester: { id?: string; name: string; employeeId?: string | null };
  targetUser: { id?: string; name: string; employeeId?: string | null };
  requesterSchedule: { id: string; date: string; status: string; shift: { id: string; name: string; startTime?: string; endTime?: string }; location?: { name?: string } | null };
  targetSchedule: { id: string; date: string; status: string; shift: { id: string; name: string; startTime?: string; endTime?: string }; location?: { name?: string } | null };
}

export interface CalendarCell {
  id: string;
  date: string;
  status: 'WORK' | 'OFF';
  isEligibleOff: boolean;
  shift: { id: string; name: string; code: string; startTime: string; endTime: string };
  location: { name: string; code: string } | null;
}

export interface OffDayItem {
  id: string;
  date: string;
  shift: { name: string; startTime: string; endTime: string };
  location: string | null;
}

export interface CandidateOff {
  operator: {
    id: string;
    name: string;
    username: string;
    employeeId: string;
    position: string | null;
    avatarUrl: string | null;
  };
  offDays: { id: string; date: string }[];
  offCount: number;
}

const WEEK_HEADER = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTH_LOCALE = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'Desember'];

interface OperatorShiftExchangeClientProps {
  initialExchanges: ShiftExchangeItem[];
  initialCalendar: CalendarCell[];
  currentUserId: string;
  initialYear: number;
  initialMonth: number;
}

function monthCells(year: number, month: number): (number | null)[] {
  const first = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`).getUTCDay();
  const offset = (first + 6) % 7; // Sen=0
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function OperatorShiftExchangeClient({
  initialExchanges,
  initialCalendar,
  currentUserId,
  initialYear,
  initialMonth,
}: OperatorShiftExchangeClientProps) {
  const router = useRouter();
  const [exchanges] = useState(initialExchanges);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // ---- Step: my OFF calendar ----
  const [showModal, setShowModal] = useState(false);
  const [calYear, setCalYear] = useState(initialYear);
  const [calMonth, setCalMonth] = useState(initialMonth);
  const [calendar, setCalendar] = useState<CalendarCell[]>(initialCalendar);
  const [selectedMyOff, setSelectedMyOff] = useState<CalendarCell | null>(null);

  // ---- Step: pick partner ----
  const [empQuery, setEmpQuery] = useState('');
  const [empLoading, setEmpLoading] = useState(false);
  const [candidates, setCandidates] = useState<CandidateOff[]>([]);
  const [empSearched, setEmpSearched] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<CandidateOff | null>(null);

  // ---- Step: pick partner's OFF ----
  const [partnerOffLoading, setPartnerOffLoading] = useState(false);
  const [partnerOffDays, setPartnerOffDays] = useState<OffDayItem[]>([]);
  const [selectedPartnerOff, setSelectedPartnerOff] = useState<OffDayItem | null>(null);

  // ---- Step: reason + proof ----
  const [reason, setReason] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentMime, setAttachmentMime] = useState('');
  const [attachmentSize, setAttachmentSize] = useState<number | undefined>(undefined);
  const [driveFileId, setDriveFileId] = useState('');
  const [driveWebViewLink, setDriveWebViewLink] = useState('');
const openModal = () => {
    setError(null);
    setSuccess(null);
    setShowModal(true);
    setCalYear(initialYear);
    setCalMonth(initialMonth);
    setCalendar(initialCalendar);
    setSelectedMyOff(null);
    setEmpQuery('');
    setCandidates([]);
    setEmpSearched(false);
    setSelectedPartner(null);
    setPartnerOffDays([]);
    setSelectedPartnerOff(null);
    setReason('');
    setAttachmentUrl('');
    setAttachmentName('');
    setAttachmentMime('');
    setAttachmentSize(undefined);
    setDriveFileId('');
    setDriveWebViewLink('');
  };

  const monthPrev = () => {
    let y = calYear, m = calMonth - 1;
    if (m < 1) { m = 12; y -= 1; }
    setCalYear(y); setCalMonth(m);
    setSelectedMyOff(null);
  };
  const monthNext = () => {
    let y = calYear, m = calMonth + 1;
    if (m > 12) { m = 1; y += 1; }
    setCalYear(y); setCalMonth(m);
    setSelectedMyOff(null);
  };

  const selectMyOff = (cell: CalendarCell) => {
    if (!cell.isEligibleOff) return;
    setSelectedMyOff(cell);
    setSelectedPartner(null);
    setSelectedPartnerOff(null);
    setPartnerOffDays([]);
    setCandidates([]);
    setEmpSearched(false);
    setEmpQuery('');
    // Auto-load kandidat eligible berbasis tanggal OFF yang dipilih
    void searchPartners(cell.date);
  };

  const searchPartners = async (offDate?: string) => {
    const ctxDate = offDate || selectedMyOff?.date;
    if (!ctxDate) {
      setCandidates([]);
      setEmpSearched(false);
      return;
    }
    setEmpLoading(true);
    const res = await findExchangeCandidatesAction({ requesterOffDate: ctxDate, query: empQuery });
    setEmpLoading(false);
    if (res.success) {
      setCandidates(res.candidates || []);
      setEmpSearched(true);
    } else {
      setError(res.error || 'Gagal mencari kandidat.');
      setCandidates([]);
      setEmpSearched(true);
    }
  };

  const selectPartner = async (c: CandidateOff) => {
    setSelectedPartner(c);
    setSelectedPartnerOff(null);
    setPartnerOffDays([]);
    setPartnerOffLoading(true);
    const res = await getOperatorEligibleOffDaysAction(c.operator.id);
    setPartnerOffLoading(false);
    if (res.success) {
      setPartnerOffDays(res.offDays || []);
    } else {
      setError(res.error || 'Gagal memuat hari OFF operator.');
      setPartnerOffDays([]);
    }
  };
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMyOff) { setError('Pilih hari OFF Anda.'); return; }
    if (!selectedPartner) { setError('Pilih operator pengganti.'); return; }
    if (!selectedPartnerOff) { setError('Pilih hari OFF operator pengganti.'); return; }
    if (!reason.trim()) { setError('Alasan tukar hari OFF wajib diisi.'); return; }
    const hasProof = Boolean(attachmentUrl || driveWebViewLink || driveFileId);
    if (!hasProof) { setError('Bukti surat wajib dilampirkan untuk mengajukan tukar hari OFF.'); return; }

    setLoading(true);
    setError(null);
    const res = await submitShiftExchangeAction({
      requesterScheduleId: selectedMyOff.id,
      targetUserId: selectedPartner.operator.id,
      targetScheduleId: selectedPartnerOff.id,
      reason: reason.trim(),
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
      attachmentMime: attachmentMime || undefined,
      attachmentSize: attachmentSize || undefined,
      driveFileId: driveFileId || undefined,
      driveWebViewLink: driveWebViewLink || undefined,
    });
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Gagal mengajukan tukar hari OFF.');
    } else {
      setSuccess('Permintaan tukar hari OFF berhasil diajukan. Operator tujuan akan di-notifikasi.');
      setShowModal(false);
      router.refresh();
    }
  };

  const handleRespond = async (exchangeId: string, accepted: boolean) => {
    setRespondingId(exchangeId);
    setError(null);
    const res = await respondShiftExchangeAction({ exchangeId, accepted });
    setRespondingId(null);
    if (!res.success) {
      setError(res.error || 'Gagal memproces jawaban permintaan.');
    } else {
      setSuccess(accepted ? 'Permintaan disetujui — menunggu persetujuan Manager.' : 'Permintaan ditolak.');
      router.refresh();
    }
  };

  const pendingForMe = exchanges.filter(
    (ex) => ex.targetUser.id === currentUserId && ex.status === 'PENDING' && !ex.targetAcceptedAt
  );

  const cells = useMemo(() => monthCells(calYear, calMonth), [calYear, calMonth]);

  const cellFor = (day: number) => {
    const ds = dateStr(calYear, calMonth, day);
    return calendar.find((c) => c.date === ds);
  };

  return (
    <div className="space-y-5">
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-extrabold text-[#0F2F63] uppercase tracking-wider">
          Daftar Permintaan Tukar Hari OFF
        </h3>
        <button
          type="button"
          onClick={openModal}
          className="px-3 py-2 text-xs font-bold bg-[#0B3568] hover:bg-[#092B57] text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Tukar Hari OFF
        </button>
      </div>
{pendingForMe.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <ArrowLeftRight className="h-4 w-4" /> Permintaan Tukar Hari OFF Untuk Anda
          </p>
          <div className="mt-3 space-y-3">
            {pendingForMe.map((ex) => (
              <div key={ex.id} className="rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0F2F63]">
                      {ex.requester.name}
                      {ex.attachmentUrl || ex.driveFileId ? ' — Bukti tersedia' : ''}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{ex.reason}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Hari OFF Anda: <strong className="text-[#0B3568]">{ex.targetDate}</strong> · Hari OFF paham: {ex.requesterSchedule.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ex.driveWebViewLink && (
                      <a href={ex.driveWebViewLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-slate-200 text-[#0B3568] hover:bg-slate-50" title="Lihat Bukti">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRespond(ex.id, false)}
                      disabled={respondingId === ex.id}
                      className="px-3 py-1.5 text-xs font-bold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespond(ex.id, true)}
                      disabled={respondingId === ex.id}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer"
                    >
                      Terima
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {exchanges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="mx-auto h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <p className="mt-2 text-xs font-bold text-slate-600">Belum ada permintaan tukar hari OFF</p>
          <p className="text-[11px] text-slate-400">Ajukan permintaan pertukaran hari OFF untuk mulai.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {exchanges.map((ex) => (
            <div key={ex.id} className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#0F2F63]">{ex.requester.name} ↔ {ex.targetUser.name}</span>
                  <StatusBadge status={ex.status} size="sm" />
                  {ex.targetAcceptedAt ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-bold">Disetujui Operator</span>
                  ) : null}
                  {ex.driveFileId ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[9px] font-bold">Bukti ✓</span>
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  OFF: {ex.requesterSchedule.date} ↔ {ex.targetDate} · {ex.reason}
                </p>
              </div>
              {ex.driveWebViewLink && (
                <a href={ex.driveWebViewLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-slate-200 text-[#0B3568] hover:bg-slate-50" title="Lihat Bukti">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
{/* Main Modal — Tukar Hari OFF */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Tukar Hari OFF"
        eyebrow="Pertukaran OFF × OFF"
        size="xl"
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-xs font-bold bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              form="off-exchange-form"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-[#0B3568] hover:bg-[#092B57] text-white rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Send className="h-3.5 w-3.5" />
              <span>{loading ? 'Kirim...' : 'Kirim Permintaan'}</span>
            </button>
          </div>
        }
      >
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <form id="off-exchange-form" onSubmit={handleSubmit} className="space-y-4">
          {/* STEP 1 — Pilih Hari OFF Anda */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs font-black uppercase tracking-wider text-[#0F2F63] flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> 1 · Pilih Hari OFF Anda
              </p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={monthPrev} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Bulan Sebelumnya">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-bold text-[#0B3568] tabular-nums">
                  {MONTH_LOCALE[calMonth - 1]} {calYear}
                </span>
                <button type="button" onClick={monthNext} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Bulan Berikutnya">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="mt-1 text-[10.5px] text-slate-500">Pilih tanggal OFF yang ingin Anda tukarkan dengan operator lain.</p>

            <div className="mt-2.5 grid grid-cols-7 gap-1">
              {WEEK_HEADER.map((w) => (
                <div key={w} className="text-center text-[9px] font-bold text-slate-400 py-1">{w}</div>
              ))}
              {cells.map((day, i) => {
                const cell = day ? cellFor(day) : null;
                const isSel = selectedMyOff && cell && selectedMyOff.id === cell.id;
                return (
                  <div key={i} className={`aspect-square ${cell ? '' : 'invisible'}`}>
                    {cell ? (
                      <button
                        type="button"
                        onClick={() => selectMyOff(cell)}
                        disabled={!cell.isEligibleOff}
                        className={`w-full h-full rounded-lg text-[9.5px] font-mono transition ${
                          isSel
                            ? 'bg-[#1769AA] text-white ring-2 ring-[#1769AA] font-black'
                            : cell.isEligibleOff
                              ? 'bg-red-50 text-[#DC2626] font-bold hover:bg-red-100 hover:ring-2 hover:ring-[#DC2626]'
                              : cell.status === 'OFF'
                                ? 'bg-red-50/40 text-[#DC2626] opacity-60 cursor-not-allowed'
                                : 'bg-slate-100 text-slate-600 cursor-not-allowed opacity-50'
                        }`}
                        title={cell.status}
                      >
                        {day}
                        {cell.status === 'OFF' && <span className="block text-[7px] uppercase font-black">OFF</span>}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {selectedMyOff && (
              <div className="mt-2.5 rounded-lg border border-[#1769AA] bg-[#1769AA]/5 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#0F2F63] flex items-center gap-1">
                  <Check className="h-3 w-3 text-emerald-600" /> OFF YANG DIPILIH
                </p>
                <p className="text-xs font-black text-[#0B3568] mt-0.5">{selectedMyOff.date}</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  {WEEK_HEADER[new Date(`${selectedMyOff.date}T00:00:00Z`).getUTCDay() === 0 ? 6 : 0]} · Status: OFF
                </p>
              </div>
            )}
          </div>
{/* STEP 2 — Karyawan yang Bisa Diajak Tukar (berbasis tanggal OFF yang dipilih) */}
          {selectedMyOff && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
              <p className="text-xs font-black uppercase tracking-wider text-[#0F2F63] flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" /> 2 · Karyawan yang Bisa Diajak Tukar
              </p>
              <p className="mt-1 text-[10.5px] text-slate-500">
                Karyawan yang dapat bertukar dengan OFF Anda pada <strong className="text-[#0B3568]">{selectedMyOff.date}</strong>
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={empQuery}
                  onChange={(e) => setEmpQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchPartners(selectedMyOff.date); } }}
                  placeholder="Cari nama, username, atau ID pegawai..."
                  className="flex-1 min-w-0 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0B3568]"
                />
                <button
                  type="button"
                  onClick={() => searchPartners(selectedMyOff.date)}
                  disabled={empLoading}
                  className="px-3 py-2 text-xs font-bold bg-[#0B3568] hover:bg-[#092B57] text-white rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {empLoading ? 'Mencari...' : 'Cari'}
                </button>
              </div>

              {empLoading && <p className="mt-1.5 text-[11px] text-[#1769AA] font-medium"><Loader2 className="h-3 w-3 animate-spin inline-block" /> Mencari karyawan eligible...</p>}

              {empSearched && !empLoading && candidates.length === 0 && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-800">
                  Tidak ada karyawan yang tersedia untuk pertukaran OFF pada tanggal ini.
                  <span className="block mt-0.5 text-[10px] text-amber-700">Coba pilih tanggal OFF lainnya.</span>
                </div>
              )}

              {candidates.length > 0 && (
                <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto">
                  {candidates.map((c) => (
                    <div key={c.operator.id} className={`rounded-lg border p-2.5 ${selectedPartner?.operator.id === c.operator.id ? 'border-[#1769AA] bg-[#1769AA]/5' : 'border-slate-200 bg-white'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-[#0F2F63]">
                            {c.operator.name}
                            <span className="text-[10px] text-slate-400"> @{c.operator.username} · {c.operator.employeeId}</span>
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {c.offCount} OFF tersedia: {c.offDays.map((d) => d.date.slice(5)).join(', ')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => selectPartner(c)}
                          className="px-2.5 py-1.5 text-[10.5px] font-bold bg-[#0B3568] hover:bg-[#092B57] text-white rounded-lg transition cursor-pointer"
                        >
                          {selectedPartner?.operator.id === c.operator.id ? 'Dipilih ✓' : 'Pilih'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* STEP 3 — Pilih OFF Operator Tujuan */}
          {selectedPartner && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
              <p className="text-xs font-black uppercase tracking-wider text-[#0F2F63] flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> 3 · Pilih Hari OFF {selectedPartner.operator.name}
              </p>

              {partnerOffLoading && <p className="mt-2 text-[11px] text-[#1769AA] font-medium"><Loader2 className="h-3 w-3 animate-spin inline-block" /> Memuat hari OFF...</p>}

              {!partnerOffLoading && partnerOffDays.length === 0 && (
                <p className="mt-2 text-[11px] text-slate-400">Operator ini tidak memiliki hari OFF eligible untuk ditukar.</p>
              )}

              {partnerOffDays.length > 0 && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                  {partnerOffDays.map((off) => (
                    <button
                      type="button"
                      key={off.id}
                      onClick={() => setSelectedPartnerOff(off)}
                      className={`rounded-lg border p-2.5 text-left ${
                        selectedPartnerOff?.id === off.id
                          ? 'border-[#1769AA] bg-[#1769AA]/5 ring-1 ring-[#1769AA]'
                          : 'border-red-200 bg-red-50/40 hover:border-[#DC2626] hover:bg-red-100/50'
                      } transition cursor-pointer`}
                    >
                      <p className="text-[10.5px] font-bold text-[#DC2626] tabular-nums">{off.date}</p>
                      <p className="text-[9.5px] text-slate-500">OFF</p>
                    </button>
                  ))}
                </div>
              )}

              {selectedPartnerOff && (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2.5">
                  <p className="text-[10.5px] font-bold text-emerald-800 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Hari OFF {selectedPartner.operator.name}: {selectedPartnerOff.date}
                  </p>
                </div>
              )}
            </div>
          )}
{/* STEP 4 — Preview */}
          {selectedMyOff && selectedPartner && selectedPartnerOff && (
            <div className="rounded-xl border border-[#1769AA] bg-[#1769AA]/5 p-3.5">
              <p className="text-xs font-black uppercase tracking-wider text-[#0F2F63] flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Konfirmasi Tukar OFF
              </p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-black uppercase text-slate-400">Anda</p>
                  <p className="text-xs font-black text-[#0B3568] mt-1">{selectedMyOff.date} → OFF</p>
                  <p className="text-[10px] text-slate-400 mt-1">OFF Anda bertukar dengan OFF {selectedPartner.operator.name}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-black uppercase text-slate-400">{selectedPartner.operator.name}</p>
                  <p className="text-xs font-black text-[#0B3568] mt-1">{selectedPartnerOff.date} → OFF</p>
                  <p className="text-[10px] text-slate-400 mt-1">OFF {selectedPartner.operator.name} berpindah ke {selectedMyOff.date}</p>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-600 leading-relaxed">
                <strong>Hasil:</strong> Hari OFF berpindah satu-satu antara tanggal — kedua operator tetap mendapat jatah OFF. Roster resmi diperbarui setelah approval Manager/Admin.
              </div>
            </div>
          )}

          {/* STEP 5 — Alasan */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Alasan Tukar Hari OFF</label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Keperluan keluarga mendesak, jadwal personal konflikt..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0B3568]"
            />
          </div>

          {/* STEP 6 — Bukti */}
          <div>
            <FileUploadProof
              label="Bukti / Surat Persetujuan (wajib)"
              folderCategory="SHIFT_EXCHANGE"
              subCategory={selectedMyOff?.shift.name || 'Tukar Hari OFF'}
              required
              onFileUploaded={(meta) => {
                setAttachmentUrl(meta?.attachmentUrl || '');
                setAttachmentName(meta?.attachmentName || '');
                setAttachmentMime(meta?.attachmentMime || '');
                setAttachmentSize(meta?.attachmentSize || undefined);
                setDriveFileId(meta?.driveFileId || '');
                setDriveWebViewLink(meta?.driveWebViewLink || '');
              }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}