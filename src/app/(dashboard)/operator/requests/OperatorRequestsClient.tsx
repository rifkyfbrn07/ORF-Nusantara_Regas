'use client';

import React, { useState } from 'react';
import {
  Plus,
  Send,
  Check,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  FileText,
  ExternalLink,
  Paperclip,
  FileDown,
  Phone,
  MapPin,
  UserCheck,
  Calendar,
  Building2,
  BadgeInfo,
  Printer,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { FileUploadProof } from '@/components/ui/FileUploadProof';
import { submitLeaveAction, processLeaveApprovalAction } from '@/server/actions/leaveActions';
import { LeaveDocxViewer } from '@/components/leave/LeaveDocxViewer';
import { useRouter } from 'next/navigation';

export interface LeaveRequestItem {
  id: string;
  type: 'LEAVE' | 'PERMISSION' | 'SICK';
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
  storageProvider?: string | null;
  storagePath?: string | null;
  reviewerNote?: string | null;
  reviewedBy?: { name: string } | null;
  approvalStage?: string | null;
  reviewerName?: string | null;
  reviewerApprovedAt?: string | Date | null;
  teamLeadName?: string | null;
  teamLeadApprovedAt?: string | Date | null;
  teamLeadNote?: string | null;
  managerName?: string | null;
  managerApprovedAt?: string | Date | null;
  managerNote?: string | null;
}

export interface PendingApprovalItem {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  approvalStage?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
  storageProvider?: string | null;
  storagePath?: string | null;
  reviewedBy?: { id?: string; name: string } | null;
  user: {
    id: string;
    name: string;
    username?: string | null;
    employeeId: string;
    position?: string | null;
    team?: string | null;
    department?: { name: string } | null;
  };
}

interface UserProfile {
  name: string;
  employeeId: string;
  position: string;
  department?: string;
  phone?: string;
  team?: string | null;
  role?: string;
}

interface LeaveEntitlement {
  hakCutiBerjalan: number;
  cutiBesar: number;
  cutiTelahDiambil: number;
  sisaCuti: number;
  periodePengambilan: string;
  tanggalMasuk: string;
  tanggalMasukRaw: string;
}

interface OperatorRequestsClientProps {
  initialRequests: LeaveRequestItem[];
  today: string;
  currentUser?: UserProfile;
  entitlement?: LeaveEntitlement;
  pendingApprovals?: PendingApprovalItem[];
  defaultTab?: 'mine' | 'approvals';
}

function parseReasonData(rawReason: string) {
  if (!rawReason) return { text: '', extra: null };
  if (!rawReason.includes('|||')) return { text: rawReason, extra: null };
  const [text, meta] = rawReason.split('|||');
  try {
    return {
      text: text.trim(),
      extra: JSON.parse(meta.trim()) as { alamat?: string; penyerahanTugas?: string; telepon?: string },
    };
  } catch {
    return { text: rawReason, extra: null };
  }
}

const APPROVAL_STAGES = [
  { key: 'REVIEWER', label: 'Reviewer' },
  { key: 'TEAM_LEAD', label: 'Team Lead' },
  { key: 'MANAGER', label: 'Manager' },
] as const;

const STAGE_LABELS: Record<string, string> = {
  REVIEWER: 'Menunggu Reviewer',
  TEAM_LEAD: 'Menunggu Team Lead',
  MANAGER: 'Menunggu Manager',
};

const STAGE_NAMES: Record<string, string> = {
  REVIEWER: 'Reviewer',
  TEAM_LEAD: 'Team Lead',
  MANAGER: 'Manager',
};

/** Status tampilan pengajuan sesuai alur approval 3 tahap (mirror dari leaveService). */
export function getLeaveDisplayStatusLabel(r: {
  status: string;
  approvalStage?: string | null;
}): string {
  if (r.status === 'APPROVED') return 'Disetujui';
  if (r.status === 'REJECTED') return 'Ditolak';
  return STAGE_LABELS[r.approvalStage || 'REVIEWER'] || 'Menunggu Reviewer';
}

function formatStageDate(value?: string | Date | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Pipeline approval Reviewer → Team Lead → Manager untuk satu pengajuan. */
function StageTimeline({ request }: { request: LeaveRequestItem }) {
  const approved = request.status === 'APPROVED';
  const rejected = request.status === 'REJECTED';

  const decidedFlags = APPROVAL_STAGES.map((s) =>
    s.key === 'REVIEWER'
      ? Boolean(request.reviewerApprovedAt)
      : s.key === 'TEAM_LEAD'
        ? Boolean(request.teamLeadApprovedAt)
        : Boolean(request.managerApprovedAt)
  );
  // Penolakan bersifat terminal — tahap terakhir yang tercatat adalah tahap penolak.
  const rejectIndex = rejected ? decidedFlags.lastIndexOf(true) : -1;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      {APPROVAL_STAGES.map((stage, idx) => {
        const name =
          stage.key === 'REVIEWER'
            ? request.reviewerName
            : stage.key === 'TEAM_LEAD'
              ? request.teamLeadName
              : request.managerName;
        const at =
          stage.key === 'REVIEWER'
            ? request.reviewerApprovedAt
            : stage.key === 'TEAM_LEAD'
              ? request.teamLeadApprovedAt
              : request.managerApprovedAt;

        let state: 'done' | 'rejected' | 'current' | 'waiting' = 'waiting';
        if (approved || (rejected && idx < rejectIndex)) state = 'done';
        else if (rejected && idx === rejectIndex) state = 'rejected';
        else if (!rejected && request.approvalStage === stage.key) state = 'current';

        const pill = {
          done: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400',
          rejected:
            'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
          current:
            'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400',
          waiting:
            'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500',
        }[state];

        return (
          <span
            key={stage.key}
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${pill}`}
            title={
              state === 'done'
                ? `Tahap ${stage.label} telah disetujui${name ? ` oleh ${name}` : ''}`
                : state === 'rejected'
                  ? `Tahap ${stage.label} menolak pengajuan ini`
                  : state === 'current'
                    ? `Pengajuan sedang menunggu keputusan ${stage.label}`
                    : `Tahap ${stage.label} belum dimulai`
            }
          >
            {state === 'done' && <Check className="h-3 w-3" />}
            {state === 'rejected' && <X className="h-3 w-3" />}
            {state === 'current' && <Clock className="h-3 w-3" />}
            <span>{stage.label}</span>
            {state === 'done' && name && (
              <span className="font-medium">
                • {name}
                {formatStageDate(at) ? ` (${formatStageDate(at)})` : ''}
              </span>
            )}
            {state === 'rejected' && name && <span className="font-medium">• ditolak {name}</span>}
            {state === 'current' && <span className="font-medium">• menunggu</span>}
          </span>
        );
      })}
    </div>
  );
}

/** Map item antrian approval ke tipe pratinjau bukti surat. */
function pendingToPreview(p: PendingApprovalItem): LeaveRequestItem {
  return {
    id: p.id,
    type: p.type as LeaveRequestItem['type'],
    startDate: p.startDate,
    endDate: p.endDate,
    reason: p.reason,
    status: p.status,
    approvalStage: p.approvalStage,
    attachmentUrl: p.attachmentUrl,
    attachmentName: p.attachmentName,
    attachmentMime: p.attachmentMime,
    attachmentSize: p.attachmentSize,
    driveFileId: p.driveFileId,
    driveWebViewLink: p.driveWebViewLink,
    storageProvider: p.storageProvider,
    storagePath: p.storagePath,
    reviewedBy: p.reviewedBy || null,
  };
}

/** Satu baris pada antrian persetujuan (Reviewer / Team Lead). */
function ApprovalQueueRow({
  item,
  onPreview,
  onDecide,
}: {
  item: PendingApprovalItem;
  onPreview: (p: PendingApprovalItem) => void;
  onDecide: (input: {
    id: string;
    stage: string;
    decision: 'APPROVED' | 'REJECTED';
    title: string;
  }) => void;
}) {
  const hasProof = Boolean(
    item.attachmentUrl || item.driveWebViewLink || item.driveFileId || item.storagePath
  );
  const { text: cleanReason } = parseReasonData(item.reason);
  const stage = item.approvalStage || 'REVIEWER';
  const title = `${item.type} ${item.user.name} (${item.startDate} s/d ${item.endDate})`;

  return (
    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
      <div className="space-y-2 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-black text-[11px] uppercase px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#0B3568] dark:text-[#38BDF8] border border-blue-200/60 dark:border-blue-800">
            {item.type}
          </span>
          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {item.startDate} s/d {item.endDate}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
            <Clock className="h-3 w-3" />
            {STAGE_LABELS[stage] || 'Menunggu Reviewer'}
          </span>
          {hasProof && (
            <button
              type="button"
              onClick={() => onPreview(item)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full transition cursor-pointer"
            >
              <Paperclip className="h-3 w-3" />
              <span>Bukti lampiran</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-black">{item.user.name}</span>
          <span className="font-mono text-slate-400">({item.user.employeeId})</span>
          <span className="text-slate-400">• {item.user.position || '-'}</span>
          {item.user.team && <span className="text-slate-400">• Tim {item.user.team}</span>}
          {item.user.department?.name && (
            <span className="text-slate-400">• {item.user.department.name}</span>
          )}
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
          &ldquo;{cleanReason}&rdquo;
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onDecide({ id: item.id, stage, decision: 'APPROVED', title })}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Setujui</span>
        </button>
        <button
          type="button"
          onClick={() => onDecide({ id: item.id, stage, decision: 'REJECTED', title })}
          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
          <span>Tolak</span>
        </button>
      </div>
    </div>
  );
}

export function OperatorRequestsClient({
  initialRequests,
  today,
  currentUser,
  entitlement,
  pendingApprovals = [],
  defaultTab = 'mine',
}: OperatorRequestsClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'mine' | 'approvals'>(defaultTab);
  const [showModal, setShowModal] = useState(false);

  // Approval queue state (Reviewer / Team Lead)
  const [approvalReview, setApprovalReview] = useState<{
    id: string;
    stage: string;
    decision: 'APPROVED' | 'REJECTED';
    title: string;
  } | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [approving, setApproving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Proof Viewer Modal State
  const [previewItem, setPreviewItem] = useState<LeaveRequestItem | null>(null);

  // Leave DOCX / PDF viewer modal state
  const [docViewItem, setDocViewItem] = useState<LeaveRequestItem | null>(null);

  const [formData, setFormData] = useState({
    type: 'LEAVE' as 'LEAVE' | 'PERMISSION' | 'SICK',
    startDate: today,
    endDate: today,
    reason: '',
    telepon: currentUser?.phone || '',
    alamatCuti: '',
    penyerahanTugas: '',
    attachmentUrl: '',
    attachmentName: '',
    attachmentMime: '',
    attachmentSize: undefined as number | undefined,
    driveFileId: '',
    driveWebViewLink: '',
    storageProvider: '',
    storagePath: '',
  });

  // Calculate days for the selected range
  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 1;
    const s = new Date(formData.startDate);
    const e = new Date(formData.endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 1;
    return Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    setError(null);

    const hasProof = Boolean(formData.attachmentUrl || formData.driveWebViewLink || formData.driveFileId || formData.storagePath);
    if (!hasProof) {
      setError('Bukti surat wajib dilampirkan untuk pengajuan ini.');
      return;
    }

    setLoading(true);

    const res = await submitLeaveAction({
      type: formData.type,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason,
      telepon: formData.telepon || undefined,
      alamatCuti: formData.alamatCuti || undefined,
      penyerahanTugas: formData.penyerahanTugas || undefined,
      attachmentUrl: formData.attachmentUrl || undefined,
      attachmentName: formData.attachmentName || undefined,
      attachmentMime: formData.attachmentMime || undefined,
      attachmentSize: formData.attachmentSize || undefined,
      driveFileId: formData.driveFileId || undefined,
      driveWebViewLink: formData.driveWebViewLink || undefined,
      storageProvider: formData.storageProvider || undefined,
      storagePath: formData.storagePath || undefined,
    });
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Gagal mengirimkan pengajuan.');
    } else {
      setSuccess(
        'Pengajuan berhasil dikirimkan. Alur persetujuan berurutan: Reviewer → Team Lead → Manager. Anda dapat memantau statusnya pada daftar di bawah.'
      );
      setShowModal(false);
      setFormData({
        type: 'LEAVE',
        startDate: today,
        endDate: today,
        reason: '',
        telepon: currentUser?.phone || '',
        alamatCuti: '',
        penyerahanTugas: '',
        attachmentUrl: '',
        attachmentName: '',
        attachmentMime: '',
        attachmentSize: undefined,
        driveFileId: '',
        driveWebViewLink: '',
        storageProvider: '',
        storagePath: '',
      });
      router.refresh();
    }
  };

  /** Proses keputusan tahap Reviewer/Team Lead dari antrian persetujuan. */
  const handleApprovalConfirm = async () => {
    if (!approvalReview) return;
    setApproving(true);
    setError(null);

    const res = await processLeaveApprovalAction({
      requestId: approvalReview.id,
      stage: approvalReview.stage as 'REVIEWER' | 'TEAM_LEAD' | 'MANAGER',
      status: approvalReview.decision,
      note: approvalNote.trim() || undefined,
    });
    setApproving(false);

    if (!res.success) {
      setError(res.error || 'Gagal memproses persetujuan.');
    } else {
      setSuccess(
        `Pengajuan berhasil di-${approvalReview.decision === 'APPROVED' ? 'setujui' : 'tolak'} pada tahap ${
          STAGE_NAMES[approvalReview.stage] || approvalReview.stage
        }.`
      );
      setApprovalReview(null);
      setApprovalNote('');
      router.refresh();
    }
  };

  return (
    <div className="space-y-5">
      {success && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700 dark:text-emerald-400 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && !showModal && !approvalReview && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 dark:text-red-400 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs: Permohonan Saya / Antrian Persetujuan (Reviewer-Team Lead) */}
      {pendingApprovals.length > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setTab('mine')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === 'mine'
                ? 'bg-[#0B3568] text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Permohonan Saya ({initialRequests.length})</span>
          </button>
          <button
            onClick={() => setTab('approvals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === 'approvals'
                ? 'bg-[#0B3568] text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Persetujuan Tim ({pendingApprovals.length})</span>
          </button>
        </div>
      )}

      {tab === 'mine' && (
      <>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-[#0B3568] dark:text-[#38BDF8] uppercase tracking-wider">
            Riwayat Permohonan Cuti &amp; Izin
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dokumen resmi Formulir Cuti (.docx) dapat langsung diunduh sesuai template PT Permata Karya Jasa.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-[#0B3568] hover:bg-[#092B57] dark:bg-[#0284C7] dark:hover:bg-[#0369A1] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Pengajuan Baru</span>
        </button>
      </div>

      {/* Requests History List */}
      <div className="bg-white dark:bg-[#0B1E32] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {initialRequests.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 dark:text-slate-500">
              Belum ada permohonan cuti atau izin yang diajukan.
            </div>
          ) : (
            initialRequests.map((r) => {
              const hasProof = Boolean(r.attachmentUrl || r.driveWebViewLink || r.driveFileId || r.storagePath);
              const { text: cleanReason, extra } = parseReasonData(r.reason);

              return (
                <div
                  key={r.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-[11px] uppercase px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#0B3568] dark:text-[#38BDF8] border border-blue-200/60 dark:border-blue-800">
                        {r.type}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {r.startDate} s/d {r.endDate}
                      </span>

                      {/* Evidence Status Badge */}
                      {hasProof ? (
                        <button
                          type="button"
                          onClick={() => setPreviewItem(r)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full transition cursor-pointer"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span>Bukti lampiran</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Belum ada bukti
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      &ldquo;{cleanReason}&rdquo;
                    </p>

                    {extra && (
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        {extra.alamat && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            Alamat: {extra.alamat}
                          </span>
                        )}
                        {extra.penyerahanTugas && extra.penyerahanTugas !== '-' && (
                          <span className="inline-flex items-center gap-1">
                            <UserCheck className="h-3 w-3 text-slate-400" />
                            Pengganti: {extra.penyerahanTugas}
                          </span>
                        )}
                      </div>
                    )}

                    {[
                      { label: 'Reviewer', name: r.reviewerName, note: r.reviewerNote },
                      { label: 'Team Lead', name: r.teamLeadName, note: r.teamLeadNote },
                      { label: 'Manager', name: r.managerName, note: r.managerNote },
                    ]
                      .filter((n) => n.note)
                      .map((n) => (
                        <p
                          key={n.label}
                          className="text-[11px] text-slate-500 dark:text-slate-400 italic"
                        >
                          Catatan {n.name ? n.label : 'Atasan'} ({n.name || r.reviewedBy?.name || 'Atasan'}): &ldquo;{n.note}&rdquo;
                        </p>
                      ))}

                    <StageTimeline request={r} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {/* Official Template DOCX Download Button */}
                    <a
                      href={`/api/export/leave-docx?requestId=${r.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#0B3568] dark:text-[#38BDF8] text-xs font-bold transition shadow-2xs"
                      title={
                        r.status === 'APPROVED'
                          ? 'Unduh Evidence Final Formulir Permohonan Cuti Resmi PT Permata Karya Jasa (.docx) — telah disetujui final'
                          : 'Unduh Draft Formulir Cuti (.docx) — belum disetujui final; bagian persetujuan diisi setelah approval Manager'
                      }
                    >
                      <FileDown className="h-3.5 w-3.5 text-[#0B3568] dark:text-[#38BDF8]" />
                      <span>{r.status === 'APPROVED' ? 'Evidence Final DOCX' : 'Draft DOCX'}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setDocViewItem(r)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition shadow-2xs"
                      title="Pratinjau dokumen cuti sebelum disimpan sebagai PDF"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Pratinjau PDF</span>
                    </button>

                    {/* Unduh PDF — unduh langsung sebagai PDF via cetak browser */}
                    <button
                      type="button"
                      onClick={() => setDocViewItem(r)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900 text-[#0B3568] dark:text-[#38BDF8] text-[11px] font-bold transition shadow-2xs"
                      title="Unduh dokumen cuti sebagai PDF via dialog cetak browser (draft saat pending, final setelah approval)"
                    >
                      <Printer className="h-3 w-3 text-[#0B3568] dark:text-[#38BDF8]" />
                      <span>Unduh PDF</span>
                    </button>

                    {/* Buat PDF — buat dokumen PDF dari template (draft saat pending, final setelah approved) */}
                    <button
                      type="button"
                      onClick={() => setDocViewItem(r)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold transition shadow-2xs"
                      title="Buat dokumen PDF dari template resmi cuti (draft saat belum disetujui, final setelah approval Manager)"
                    >
                      <FileText className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                      <span>Buat PDF</span>
                    </button>

                    {hasProof && (
                      <button
                        type="button"
                        onClick={() => setPreviewItem(r)}
                        className="text-xs font-bold text-[#1769AA] dark:text-[#38BDF8] hover:underline cursor-pointer px-2 py-1"
                      >
                        Lihat Surat
                      </button>
                    )}

                    <StatusBadge status={r.status} label={getLeaveDisplayStatusLabel(r)} size="md" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      </>
      )}

      {/* Antrian Persetujuan Tim — Reviewer / Team Lead memproses tahap mereka */}
      {tab === 'approvals' && (
        <div className="bg-white dark:bg-[#0B1E32] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black text-[#0B3568] dark:text-[#38BDF8] uppercase tracking-wider">
              Antrian Persetujuan Cuti &amp; Izin
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pengajuan yang menunggu keputusan Anda pada tahap saat ini. Keputusan berjalan
              berurutan: Reviewer → Team Lead → Manager.
            </p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingApprovals.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 dark:text-slate-500">
                Tidak ada pengajuan yang menunggu persetujuan Anda.
              </div>
            ) : (
              pendingApprovals.map((p) => (
                <ApprovalQueueRow
                  key={p.id}
                  item={p}
                  onPreview={(item) => setPreviewItem(pendingToPreview(item))}
                  onDecide={(input) => {
                    setApprovalNote('');
                    setError(null);
                    setApprovalReview(input);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Form */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Formulir Permohonan Cuti Resmi"
        eyebrow="PT PERMATA KARYA JASA - ORF NUSANTARA REGAS"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              form="leave-form"
              type="submit"
              disabled={loading || uploading}
              className="px-5 py-2 rounded-xl bg-[#0B3568] hover:bg-[#092B57] dark:bg-[#0284C7] dark:hover:bg-[#0369A1] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{loading ? 'Mengirim...' : 'Kirim Permohonan Cuti'}</span>
            </button>
          </div>
        }
      >
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form id="leave-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Worker Profile Card (Auto-filled from database) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B3568] dark:text-[#38BDF8]">
              <Building2 className="h-3.5 w-3.5" />
              <span>Informasi Profil Pemohon Cuti</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Nama Pekerja</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser?.name || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">NIP</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{currentUser?.employeeId || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Jabatan</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser?.position || 'Penunjang Pengoperasian ORF'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Satuan Kerja</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{currentUser?.department || 'Operasi'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5 text-[11px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <BadgeInfo className="h-3 w-3 text-blue-500" />
                  Hak Cuti Berjalan: <strong>{entitlement?.hakCutiBerjalan ?? 12} Hari</strong>
                  &nbsp;| Cuti Besar: <strong>{entitlement?.cutiBesar ?? 0} Hari</strong>
                  &nbsp;| Telah Diambil: <strong>{entitlement?.cutiTelahDiambil ?? 0} Hari</strong>
                  &nbsp;| Sisa Hak Cuti: <strong className="text-[#0B3568] dark:text-[#38BDF8]">{entitlement?.sisaCuti ?? 0} Hari</strong>
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Lama Permohonan: <strong className="text-[#0B3568] dark:text-[#38BDF8]">{calculateDays()} Hari</strong>
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
                <span>
                  Periode Pengambilan: <strong>{entitlement?.periodePengambilan || '-'}</strong>
                </span>
                <span>
                  Tanggal Masuk: <strong>{entitlement?.tanggalMasuk || '-'}</strong>
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Jenis Pengajuan</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as 'LEAVE' | 'PERMISSION' | 'SICK',
                })
              }
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0B3568]"
            >
              <option value="LEAVE">CUTI TAHUNAN (Annual Leave)</option>
              <option value="PERMISSION">IZIN / DISPENSASI (Special Permission)</option>
              <option value="SICK">SAKIT (Medical Sick Leave)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Tanggal Mulai Cuti</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Tanggal Selesai Cuti</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Alasan &amp; Perihal Cuti
            </label>
            <textarea
              required
              rows={2}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Contoh: Keperluan keluarga / Cuti tahunan ke luar kota..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0B3568]"
            />
          </div>

          {/* Additional Template Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3 text-slate-400" />
                No. Telepon / WhatsApp
              </label>
              <input
                type="text"
                value={formData.telepon}
                onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                placeholder="08xxxxxxxxxx"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-slate-400" />
                Penyerahan Tugas Kepada (Opsional)
              </label>
              <input
                type="text"
                value={formData.penyerahanTugas}
                onChange={(e) => setFormData({ ...formData, penyerahanTugas: e.target.value })}
                placeholder="Nama rekan kerja pengganti atau '-'"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-400" />
              Alamat Selama Menjalankan Cuti
            </label>
            <input
              type="text"
              value={formData.alamatCuti}
              onChange={(e) => setFormData({ ...formData, alamatCuti: e.target.value })}
              placeholder="Contoh: Jl. Merdeka No. 10 Jakarta / Kota tujuan..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Bukti Surat Cuti */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <FileUploadProof
              label="Unggah Berkas Bukti / Surat Pengantar Cuti"
              folderCategory="SURAT_CUTI"
              onUploadStateChange={setUploading}
              onFileUploaded={(meta) => {
                if (meta) {
                  setFormData({
                    ...formData,
                    attachmentUrl: meta.attachmentUrl,
                    attachmentName: meta.attachmentName,
                    attachmentMime: meta.attachmentMime || '',
                    attachmentSize: meta.attachmentSize,
                    driveFileId: meta.driveFileId || '',
                    driveWebViewLink: meta.driveWebViewLink || '',
                    storageProvider: meta.storageProvider || '',
                    storagePath: meta.storagePath || '',
                  });
                } else {
                  setFormData({
                    ...formData,
                    attachmentUrl: '',
                    attachmentName: '',
                    attachmentMime: '',
                    attachmentSize: undefined,
                    driveFileId: '',
                    driveWebViewLink: '',
                    storageProvider: '',
                    storagePath: '',
                  });
                }
              }}
            />
          </div>
        </form>
      </Modal>

      {/* Proof Viewer Modal */}
      {previewItem && (
        <Modal
          open={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title="Pratinjau Bukti Surat Cuti"
          eyebrow="DOCUMENT PREVIEW"
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              {previewItem.driveFileId || previewItem.driveWebViewLink || previewItem.attachmentUrl ? (
                <a
                  href={
                    previewItem.driveFileId
                      ? `/api/files/${encodeURIComponent(previewItem.driveFileId)}?download=1`
                      : previewItem.driveWebViewLink || previewItem.attachmentUrl || '#'
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Buka di Google Drive</span>
                </a>
              ) : <div />}
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#0B3568] dark:text-[#38BDF8]" />
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  {previewItem.attachmentName || 'Berkas Bukti Surat Cuti'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pengajuan {previewItem.type} periode {previewItem.startDate} s/d {previewItem.endDate}
              </p>
            </div>

            {(previewItem.attachmentUrl?.match(/\.(jpg|jpeg|png|webp)/i) || previewItem.attachmentMime?.startsWith('image/')) ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-80 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    previewItem.driveFileId
                      ? `/api/files/${encodeURIComponent(previewItem.driveFileId)}`
                      : previewItem.attachmentUrl || previewItem.driveWebViewLink || ''
                  }
                  alt="Bukti Surat Cuti"
                  className="max-h-80 w-auto object-contain"
                />
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <FileText className="h-8 w-8 mx-auto text-slate-400" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Berkas Dokumen PDF / Terarsip di Google Drive</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Klik tombol &quot;Buka di Google Drive&quot; di bawah untuk melihat dokumen lengkap.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Approval Decision Modal — Reviewer / Team Lead */}
      {approvalReview && (
        <Modal
          open={Boolean(approvalReview)}
          onClose={() => setApprovalReview(null)}
          title={`Konfirmasi ${
            approvalReview.decision === 'APPROVED' ? 'Persetujuan' : 'Penolakan'
          } — Tahap ${STAGE_NAMES[approvalReview.stage] || approvalReview.stage}`}
          eyebrow="REVIEW DECISION"
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setApprovalReview(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={approving}
                onClick={handleApprovalConfirm}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer ${
                  approvalReview.decision === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {approvalReview.decision === 'APPROVED' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
                <span>
                  {approving
                    ? 'Memproses...'
                    : approvalReview.decision === 'APPROVED'
                      ? 'Konfirmasi Setujui'
                      : 'Konfirmasi Tolak'}
                </span>
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Anda sedang memproses tahap{' '}
              <strong>{STAGE_NAMES[approvalReview.stage] || approvalReview.stage}</strong> untuk{' '}
              <strong>{approvalReview.title}</strong>. Keputusan dicatat dalam audit log dan
              pengirim menerima notifikasi.
              {approvalReview.decision === 'APPROVED'
                ? ' Pengajuan berpindah ke tahap berikutnya (atau disetujui final bila ini tahap terakhir).'
                : ' Pengajuan akan dihentikan dengan status Ditolak.'}
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Catatan Keputusan (opsional)
              </label>
              <textarea
                rows={3}
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Tulis alasan persetujuan/penolakan..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0B3568]"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Leave DOCX / PDF Viewer */}
      {docViewItem && (
        <LeaveDocxViewer
          open
          onClose={() => setDocViewItem(null)}
          requestId={docViewItem.id}
          status={docViewItem.status}
          statusLabel={getLeaveDisplayStatusLabel(docViewItem)}
        />
      )}
    </div>
  );
}
