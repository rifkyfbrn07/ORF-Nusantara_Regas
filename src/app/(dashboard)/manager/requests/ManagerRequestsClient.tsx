'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Check,
  X,
  UserCheck,
  ArrowLeftRight,
  AlertCircle,
  CheckCircle,
  Search,
  Plus,
  Paperclip,
  ExternalLink,
  FileText,
  User,
  Building,
  Calendar,
  Send,
  Loader2,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { FileUploadProof } from '@/components/ui/FileUploadProof';
import { reviewLeaveAction, submitLeaveAction, searchEmployeesAction } from '@/server/actions/leaveActions';
import { reviewShiftExchangeAction } from '@/server/actions/shiftExchangeActions';
import { useRouter } from 'next/navigation';

export interface ManagerLeaveRequestItem {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
  reviewerNote?: string | null;
  user: {
    id?: string;
    name: string;
    username?: string | null;
    employeeId: string;
    department?: { name: string } | null;
  };
  reviewedBy?: {
    id?: string;
    name: string;
    position?: string | null;
  } | null;
}

export interface ManagerShiftExchangeItem {
  id: string;
  status: string;
  targetDate: string;
  reason: string;
  requester: {
    id?: string;
    name: string;
    employeeId?: string | null;
    position?: string | null;
  };
  targetUser: {
    id?: string;
    name: string;
    employeeId?: string | null;
    position?: string | null;
  };
  requesterSchedule: {
    id: string;
    date: string;
    shift: {
      id: string;
      name: string;
    };
  };
}

interface EmployeeSearchResult {
  id: string;
  name: string;
  username: string;
  employeeId: string;
  position: string;
  role: string;
  department: { id: string; name: string } | null;
}

interface ManagerRequestsClientProps {
  leaveRequests: ManagerLeaveRequestItem[];
  shiftExchanges: ManagerShiftExchangeItem[];
  defaultTab: 'leave' | 'shift';
}

export function ManagerRequestsClient({
  leaveRequests,
  shiftExchanges,
  defaultTab,
}: ManagerRequestsClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'leave' | 'shift'>(defaultTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Review Modal State
  const [reviewItem, setReviewItem] = useState<{
    id: string;
    type: 'leave' | 'shift';
    decision: 'APPROVED' | 'REJECTED';
    title: string;
  } | null>(null);
  const [reviewerNote, setReviewerNote] = useState('');

  // Proof Preview Modal State
  const [previewItem, setPreviewItem] = useState<ManagerLeaveRequestItem | null>(null);

  // On-Behalf Leave Submission Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [empResults, setEmpResults] = useState<EmployeeSearchResult[]>([]);
  const [isSearchingEmp, setIsSearchingEmp] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSearchResult | null>(null);
  const [applyForm, setApplyForm] = useState({
    type: 'LEAVE' as 'LEAVE' | 'PERMISSION' | 'SICK',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    attachmentUrl: '',
    attachmentName: '',
    attachmentMime: '',
    attachmentSize: undefined as number | undefined,
    driveFileId: '',
    driveWebViewLink: '',
  });

  // Debounced search for employee selection in on-behalf modal
  useEffect(() => {
    if (!showApplyModal) return;
    const timer = setTimeout(async () => {
      setIsSearchingEmp(true);
      const res = await searchEmployeesAction(empSearchQuery);
      setIsSearchingEmp(false);
      if (res.success && res.data) {
        setEmpResults(res.data as EmployeeSearchResult[]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [empSearchQuery, showApplyModal]);

  const handleOpenReview = (
    id: string,
    type: 'leave' | 'shift',
    decision: 'APPROVED' | 'REJECTED',
    title: string
  ) => {
    setReviewItem({ id, type, decision, title });
    setReviewerNote('');
    setError(null);
  };

  const handleConfirmReview = async () => {
    if (!reviewItem) return;
    setLoading(true);
    setError(null);

    try {
      if (reviewItem.type === 'leave') {
        const res = await reviewLeaveAction({
          requestId: reviewItem.id,
          status: reviewItem.decision,
          reviewerNote: reviewerNote.trim() || undefined,
        });
        if (!res.success) throw new Error(res.error);
        setSuccess(
          `Pengajuan cuti/izin berhasil di-${
            reviewItem.decision === 'APPROVED' ? 'setujui' : 'tolak'
          }.`
        );
      } else {
        const res = await reviewShiftExchangeAction({
          exchangeId: reviewItem.id,
          status: reviewItem.decision,
          reviewerNote: reviewerNote.trim() || undefined,
        });
        if (!res.success) throw new Error(res.error);
        setSuccess(
          `Permintaan tukar shift berhasil di-${
            reviewItem.decision === 'APPROVED'
              ? 'setujui dan jadwal otomatis diperbarui'
              : 'tolak'
          }.`
        );
      }

      setReviewItem(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memproses keputusan.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyOnBehalfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) {
      setError('Pilih karyawan terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await submitLeaveAction({
      targetUserId: selectedEmployee.id,
      type: applyForm.type,
      startDate: applyForm.startDate,
      endDate: applyForm.endDate,
      reason: applyForm.reason,
      attachmentUrl: applyForm.attachmentUrl || undefined,
      attachmentName: applyForm.attachmentName || undefined,
      attachmentMime: applyForm.attachmentMime || undefined,
      attachmentSize: applyForm.attachmentSize || undefined,
      driveFileId: applyForm.driveFileId || undefined,
      driveWebViewLink: applyForm.driveWebViewLink || undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Gagal mengajukan cuti untuk karyawan.');
    } else {
      setSuccess(`Pengajuan cuti untuk ${selectedEmployee.name} berhasil diajukan.`);
      setShowApplyModal(false);
      setSelectedEmployee(null);
      setEmpSearchQuery('');
      setApplyForm({
        type: 'LEAVE',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
        attachmentUrl: '',
        attachmentName: '',
        attachmentMime: '',
        attachmentSize: undefined,
        driveFileId: '',
        driveWebViewLink: '',
      });
      router.refresh();
    }
  };

  // Filtered Leave Requests
  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const name = r.user.name?.toLowerCase() || '';
      const username = r.user.username?.toLowerCase() || '';
      const empId = r.user.employeeId?.toLowerCase() || '';
      const dept = r.user.department?.name?.toLowerCase() || '';
      const reason = r.reason?.toLowerCase() || '';
      const type = r.type?.toLowerCase() || '';

      return (
        name.includes(q) ||
        username.includes(q) ||
        empId.includes(q) ||
        dept.includes(q) ||
        reason.includes(q) ||
        type.includes(q)
      );
    });
  }, [leaveRequests, searchQuery, statusFilter]);

  return (
    <div className="space-y-5">
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between anim-fade">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('leave')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === 'leave'
                ? 'bg-[#0B3568] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>
              Pengajuan Cuti &amp; Izin (
              {leaveRequests.filter((r) => r.status === 'PENDING').length} Baru)
            </span>
          </button>

          <button
            onClick={() => setTab('shift')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === 'shift'
                ? 'bg-[#0B3568] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>
              Pergantian Shift (
              {shiftExchanges.filter((s) => s.status === 'PENDING').length} Baru)
            </span>
          </button>
        </div>

        {tab === 'leave' && (
          <button
            onClick={() => {
              setError(null);
              setShowApplyModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer w-fit"
          >
            <Plus className="h-4 w-4" />
            <span>Ajukan Cuti Operator</span>
          </button>
        )}
      </div>

      {/* Leave Requests Tab Content */}
      {tab === 'leave' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Cari orang cuti (Nama, Username, Employee ID, Department)..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0B3568]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED')
                }
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING">Menunggu (PENDING)</option>
                <option value="APPROVED">Disetujui (APPROVED)</option>
                <option value="REJECTED">Ditolak (REJECTED)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Operator</th>
                    <th className="px-5 py-3">Jenis</th>
                    <th className="px-5 py-3">Periode Tanggal</th>
                    <th className="px-5 py-3">Alasan</th>
                    <th className="px-5 py-3 text-center">Bukti Surat</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3">Catatan Reviewer</th>
                    <th className="px-5 py-3 text-right">Keputusan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredLeaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                        {searchQuery
                          ? 'Tidak ada data cuti yang sesuai dengan kata kunci pencarian.'
                          : 'Belum ada permohonan cuti atau izin.'}
                      </td>
                    </tr>
                  ) : (
                    filteredLeaveRequests.map((r) => {
                      const hasProof = Boolean(r.attachmentUrl || r.driveWebViewLink || r.driveFileId);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900">{r.user.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                              <span>{r.user.employeeId}</span>
                              {r.user.username && <span>• @{r.user.username}</span>}
                            </div>
                            {r.user.department && (
                              <div className="text-[10px] text-[#1769AA] font-bold mt-0.5">
                                {r.user.department.name}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-slate-800 uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-[11px] border border-slate-200/60">
                              {r.type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-800">
                            {r.startDate} s/d {r.endDate}
                          </td>
                          <td className="px-5 py-3.5 max-w-xs text-slate-700 leading-relaxed">
                            {r.reason}
                          </td>

                          {/* Bukti Surat Cuti Column */}
                          <td className="px-5 py-3.5 text-center">
                            {hasProof ? (
                              <button
                                type="button"
                                onClick={() => setPreviewItem(r)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full transition cursor-pointer"
                              >
                                <Paperclip className="h-3 w-3" />
                                <span>✓ Bukti tersedia</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">
                                Belum ada bukti
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <StatusBadge status={r.status} size="sm" />
                          </td>
                          <td className="px-5 py-3.5 text-[11px] text-slate-500 italic max-w-xs">
                            {r.reviewerNote
                              ? `"${r.reviewerNote}" (${r.reviewedBy?.name || 'Manager'})`
                              : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {r.status === 'PENDING' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() =>
                                    handleOpenReview(
                                      r.id,
                                      'leave',
                                      'APPROVED',
                                      `${r.user.name} (${r.type})`
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition cursor-pointer"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Setujui</span>
                                </button>
                                <button
                                  onClick={() =>
                                    handleOpenReview(
                                      r.id,
                                      'leave',
                                      'REJECTED',
                                      `${r.user.name} (${r.type})`
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                  <span>Tolak</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-400">Selesai</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Shift Exchanges Tab */}
      {tab === 'shift' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Pemohon</th>
                  <th className="px-5 py-3">Jadwal Pemohon</th>
                  <th className="px-5 py-3">Operator Tujuan</th>
                  <th className="px-5 py-3">Tanggal Tujuan</th>
                  <th className="px-5 py-3">Alasan</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Keputusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {shiftExchanges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                      Belum ada permohonan tukar shift.
                    </td>
                  </tr>
                ) : (
                  shiftExchanges.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{ex.requester.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {ex.requester.employeeId}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        <span className="font-bold text-slate-800">{ex.requesterSchedule.date}</span>
                        <div className="text-[11px] text-slate-500">
                          {ex.requesterSchedule.shift.name}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{ex.targetUser.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {ex.targetUser.employeeId}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-800">
                        {ex.targetDate}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs text-slate-700">{ex.reason}</td>
                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={ex.status} size="sm" />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {ex.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                handleOpenReview(
                                  ex.id,
                                  'shift',
                                  'APPROVED',
                                  `Tukar shift ${ex.requester.name} ↔ ${ex.targetUser.name}`
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition cursor-pointer"
                            >
                              <Check className="h-3 w-3" />
                              <span>Setujui</span>
                            </button>
                            <button
                              onClick={() =>
                                handleOpenReview(
                                  ex.id,
                                  'shift',
                                  'REJECTED',
                                  `Tukar shift ${ex.requester.name} ↔ ${ex.targetUser.name}`
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                              <span>Tolak</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">Selesai</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Confirmation Modal */}
      {reviewItem && (
        <Modal
          open={Boolean(reviewItem)}
          onClose={() => setReviewItem(null)}
          title={`Konfirmasi ${reviewItem.decision === 'APPROVED' ? 'Persetujuan' : 'Penolakan'}`}
          eyebrow="REVIEW DECISION"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setReviewItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReview}
                disabled={loading}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer ${
                  reviewItem.decision === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {loading
                  ? 'Memproses...'
                  : `Ya, ${reviewItem.decision === 'APPROVED' ? 'Setujui' : 'Tolak'}`}
              </button>
            </div>
          }
        >
          <div className="space-y-3.5">
            <p className="text-xs text-slate-600 font-medium">
              Anda akan <b>{reviewItem.decision === 'APPROVED' ? 'menyetujui' : 'menolak'}</b>{' '}
              permohonan untuk: <br />
              <span className="text-slate-900 font-bold text-sm">{reviewItem.title}</span>
            </p>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Catatan Manager (Opsional)
              </label>
              <textarea
                rows={2}
                value={reviewerNote}
                onChange={(e) => setReviewerNote(e.target.value)}
                placeholder="Contoh: Disetujui, pastikan personil pengganti terkonfirmasi..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0B3568]"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Proof Viewer Modal */}
      {previewItem && (
        <Modal
          open={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title="Bukti Surat Cuti Operator"
          eyebrow="DOCUMENT STORAGE & VERIFICATION"
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              {previewItem.driveWebViewLink || previewItem.attachmentUrl ? (
                <a
                  href={previewItem.driveWebViewLink || previewItem.attachmentUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Buka di Google Drive</span>
                </a>
              ) : <div />}
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Operator
                </span>
                <span className="font-bold text-slate-900">{previewItem.user.name}</span>
                <span className="text-slate-500 font-mono block text-[11px]">
                  NIP: {previewItem.user.employeeId}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Periode &amp; Jenis
                </span>
                <span className="font-bold text-slate-900">{previewItem.type}</span>
                <span className="text-slate-500 font-mono block text-[11px]">
                  {previewItem.startDate} s/d {previewItem.endDate}
                </span>
              </div>
              <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Nama Berkas
                </span>
                <span className="font-bold text-slate-800">
                  {previewItem.attachmentName || 'Dokumen Surat Cuti'}
                </span>
              </div>
            </div>

            {/* Embedded image preview if image */}
            {(previewItem.attachmentUrl?.match(/\.(jpg|jpeg|png|webp)/i) || previewItem.attachmentMime?.startsWith('image/')) ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 max-h-96 flex items-center justify-center bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewItem.attachmentUrl || previewItem.driveWebViewLink || ''}
                  alt="Bukti Surat Cuti"
                  className="max-h-96 w-auto object-contain"
                />
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
                <FileText className="h-10 w-10 mx-auto text-[#0B3568]" />
                <p className="text-xs font-bold text-slate-800">
                  Dokumen Tersimpan di Google Drive ORF
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Format dokumen terarsip. Klik tombol di bawah untuk membuka pratinjau lengkap di Google Drive.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* On-Behalf Leave Submission Modal */}
      {showApplyModal && (
        <Modal
          open={showApplyModal}
          onClose={() => {
            setShowApplyModal(false);
            setSelectedEmployee(null);
          }}
          title="Pengajuan Cuti / Izin Karyawan (Atas Nama)"
          eyebrow="MANAGER DISPATCH & AUTHORIZATION"
          size="xl"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  setShowApplyModal(false);
                  setSelectedEmployee(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                form="apply-on-behalf-form"
                type="submit"
                disabled={loading || !selectedEmployee}
                className="px-5 py-2 rounded-xl bg-[#0B3568] hover:bg-[#092B57] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{loading ? 'Mengajukan...' : 'Ajukan Cuti Karyawan'}</span>
              </button>
            </div>
          }
        >
          <form
            id="apply-on-behalf-form"
            onSubmit={handleApplyOnBehalfSubmit}
            className="space-y-4"
          >
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Search & Select Employee */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Pilih Karyawan / Operator *
              </label>

              {!selectedEmployee ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={empSearchQuery}
                      onChange={(e) => setEmpSearchQuery(e.target.value)}
                      placeholder="Ketik Nama, Username, atau NIP Karyawan..."
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0B3568]"
                    />
                    {isSearchingEmp && (
                      <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                    )}
                  </div>

                  {/* Dropdown Results */}
                  <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
                    {empResults.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        {empSearchQuery ? 'Karyawan tidak ditemukan.' : 'Ketik untuk mencari karyawan...'}
                      </div>
                    ) : (
                      empResults.map((emp) => (
                        <div
                          key={emp.id}
                          onClick={() => setSelectedEmployee(emp)}
                          className="p-3 hover:bg-blue-50/70 flex items-center justify-between cursor-pointer transition"
                        >
                          <div>
                            <div className="font-bold text-xs text-slate-900">{emp.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              NIP: {emp.employeeId} • @{emp.username}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {emp.department?.name || emp.position}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#0B3568] text-white">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#0B3568]">
                        {selectedEmployee.name}
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono">
                        NIP: {selectedEmployee.employeeId} • @{selectedEmployee.username}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(null)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 text-xs font-bold transition cursor-pointer"
                  >
                    Ganti
                  </button>
                </div>
              )}
            </div>

            {/* 2. Leave Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Jenis Cuti</label>
                <select
                  value={applyForm.type}
                  onChange={(e) =>
                    setApplyForm({
                      ...applyForm,
                      type: e.target.value as 'LEAVE' | 'PERMISSION' | 'SICK',
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none"
                >
                  <option value="LEAVE">CUTI TAHUNAN</option>
                  <option value="PERMISSION">IZIN / DISPENSASI</option>
                  <option value="SICK">SAKIT</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  required
                  value={applyForm.startDate}
                  onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Selesai</label>
                <input
                  type="date"
                  required
                  value={applyForm.endDate}
                  onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Alasan &amp; Keterangan Pengajuan
              </label>
              <textarea
                required
                rows={2}
                value={applyForm.reason}
                onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                placeholder="Jelaskan alasan pengajuan cuti karyawan ini..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none"
              />
            </div>

            {/* 3. Upload Bukti Surat Cuti */}
            <div className="pt-2 border-t border-slate-100">
              <FileUploadProof
                label="Unggah Berkas Surat Cuti / Dokumen Pendukung (Google Drive)"
                folderCategory="SURAT_CUTI"
                departmentName={selectedEmployee?.department?.name || 'Operations'}
                subCategory={selectedEmployee?.name || 'Operator'}
                onFileUploaded={(meta) => {
                  if (meta) {
                    setApplyForm({
                      ...applyForm,
                      attachmentUrl: meta.attachmentUrl,
                      attachmentName: meta.attachmentName,
                      attachmentMime: meta.attachmentMime || '',
                      attachmentSize: meta.attachmentSize,
                      driveFileId: meta.driveFileId || '',
                      driveWebViewLink: meta.driveWebViewLink || '',
                    });
                  } else {
                    setApplyForm({
                      ...applyForm,
                      attachmentUrl: '',
                      attachmentName: '',
                      attachmentMime: '',
                      attachmentSize: undefined,
                      driveFileId: '',
                      driveWebViewLink: '',
                    });
                  }
                }}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
