'use client';

import React, { useState, useSyncExternalStore } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Download,
  Calendar,
  FileText,
  Plus,
  Paperclip,
  ExternalLink,
  Trash2,
  AlertCircle,
  CheckCircle,
  BarChart3,
  FolderOpen,
} from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Modal } from '@/components/ui/Modal';
import { FileUploadProof } from '@/components/ui/FileUploadProof';
import {
  createOperationalReportAction,
  deleteOperationalReportAction,
} from '@/server/actions/reportActions';
import { useRouter } from 'next/navigation';

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export interface TrendDataItem {
  date: string;
  hadir: number;
  terlambat: number;
  absent: number;
}

export interface ShiftDistributionItem {
  name: string;
  hadir: number;
  terlambat: number;
}

export interface OperationalReportItem {
  id: string;
  title: string;
  reportType: string;
  periodDate: string;
  description?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
  createdAt: Date | string;
  department?: { id: string; name: string; code: string } | null;
  uploadedBy: { id: string; name: string; employeeId?: string; position?: string };
}

interface ReportsClientProps {
  summary: {
    totalRecords: number;
    attendanceRate: number;
    onTimeRate: number;
    lateCount: number;
    absenceCount: number;
    leaveCount: number;
    permissionCount: number;
    sickCount: number;
    averageLateMinutes: number;
  };
  trendData: TrendDataItem[];
  shiftDistribution: ShiftDistributionItem[];
  initialOperationalReports: OperationalReportItem[];
  departments: { id: string; name: string; code: string }[];
  startDate: string;
  endDate: string;
}

export function ReportsClient({
  summary,
  trendData,
  shiftDistribution,
  initialOperationalReports,
  departments,
  startDate,
  endDate,
}: ReportsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'analytics' | 'driveReports'>('analytics');
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const mounted = useIsMounted();

  // Create Report Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Proof Viewer Modal State
  const [previewReport, setPreviewReport] = useState<OperationalReportItem | null>(null);

  const [form, setForm] = useState({
    title: '',
    reportType: 'HARIAN',
    periodDate: new Date().toISOString().split('T')[0],
    departmentId: departments[0]?.id || '',
    description: '',
    attachmentUrl: '',
    attachmentName: '',
    attachmentMime: '',
    attachmentSize: undefined as number | undefined,
    driveFileId: '',
    driveWebViewLink: '',
  });

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/manager/reports?startDate=${start}&endDate=${end}`);
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createOperationalReportAction({
      title: form.title,
      reportType: form.reportType,
      periodDate: form.periodDate,
      departmentId: form.departmentId || undefined,
      description: form.description || undefined,
      attachmentUrl: form.attachmentUrl || undefined,
      attachmentName: form.attachmentName || undefined,
      attachmentMime: form.attachmentMime || undefined,
      attachmentSize: form.attachmentSize || undefined,
      driveFileId: form.driveFileId || undefined,
      driveWebViewLink: form.driveWebViewLink || undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Gagal menyimpan laporan.');
    } else {
      setSuccess('Laporan operasional berhasil disimpan & diarsipkan ke Google Drive.');
      setShowUploadModal(false);
      setForm({
        title: '',
        reportType: 'HARIAN',
        periodDate: new Date().toISOString().split('T')[0],
        departmentId: departments[0]?.id || '',
        description: '',
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

  const handleDeleteReport = async (id: string, title: string) => {
    if (!confirm(`Hapus laporan "${title}"?`)) return;
    const res = await deleteOperationalReportAction(id);
    if (res.success) {
      setSuccess('Laporan berhasil dihapus.');
      router.refresh();
    } else {
      setError(res.error || 'Gagal menghapus laporan.');
    }
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between anim-fade">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-[#0B3568] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analisis &amp; Kepatuhan Kehadiran</span>
          </button>

          <button
            onClick={() => setActiveTab('driveReports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'driveReports'
                ? 'bg-[#0B3568] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            <span>
              Arsip Laporan &amp; Bukti Google Drive ({initialOperationalReports.length})
            </span>
          </button>
        </div>

        {activeTab === 'driveReports' && (
          <button
            onClick={() => {
              setError(null);
              setShowUploadModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer w-fit"
          >
            <Plus className="h-4 w-4" />
            <span>Unggah Laporan Baru</span>
          </button>
        )}
      </div>

      {/* TAB 1: ANALYTICS & CHARTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Date Range & Export Header */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <form onSubmit={handleApplyFilter} className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>Periode:</span>
              </div>

              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-medium"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-medium"
              />

              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#0B3568] hover:bg-[#092B57] text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
              >
                Terapkan Filter
              </button>
            </form>

            <a
              href={`/api/export/attendance?startDate=${start}&endDate=${end}`}
              download
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition w-fit"
            >
              <Download className="h-4 w-4" />
              <span>Unduh Laporan Lengkap (.CSV)</span>
            </a>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              label="Attendance Rate"
              value={`${summary.attendanceRate}%`}
              iconName="checkCircle"
              variant="green"
              subtext="Tingkat Hadir"
            />
            <KpiCard
              label="On-Time Rate"
              value={`${summary.onTimeRate}%`}
              iconName="trendingUp"
              variant="blue"
              subtext="Tepat Waktu"
            />
            <KpiCard
              label="Terlambat"
              value={summary.lateCount}
              iconName="clock"
              variant="amber"
              subtext={`Avg ${summary.averageLateMinutes} menit`}
            />
            <KpiCard
              label="Mangkir / Absen"
              value={summary.absenceCount}
              iconName="alertTriangle"
              variant="red"
              subtext="Tanpa Keterangan"
            />
            <KpiCard
              label="Cuti Tahunan"
              value={summary.leaveCount}
              iconName="calendar"
              variant="blue"
              subtext="Disetujui"
            />
            <KpiCard
              label="Izin / Sakit"
              value={summary.permissionCount + summary.sickCount}
              iconName="users"
              variant="gray"
              subtext="Dispensasi"
            />
          </div>

          {/* Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Trend Line Chart */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Tren Kehadiran Harian (Hadir vs Terlambat)
                  </h3>
                  <p className="text-xs text-slate-500">Jumlah personil per hari</p>
                </div>
              </div>

              <div className="h-72 w-full">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line
                        type="monotone"
                        dataKey="hadir"
                        name="Hadir Tepat Waktu"
                        stroke="#16a34a"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="terlambat"
                        name="Terlambat"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="absent"
                        name="Absent"
                        stroke="#dc2626"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Shift Distribution Bar Chart */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Distribusi Kehadiran Berdasarkan Shift
                  </h3>
                  <p className="text-xs text-slate-500">Perbandingan Shift Pagi, Siang &amp; Malam</p>
                </div>
              </div>

              <div className="h-72 w-full">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={shiftDistribution}
                      margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="hadir" name="Hadir" fill="#0B3568" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="terlambat" name="Terlambat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE DRIVE OPERATIONAL REPORTS */}
      {activeTab === 'driveReports' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Laporan</th>
                    <th className="px-5 py-3">Jenis</th>
                    <th className="px-5 py-3">Departemen</th>
                    <th className="px-5 py-3">Periode</th>
                    <th className="px-5 py-3">Pengunggah</th>
                    <th className="px-5 py-3 text-center">Status Bukti</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {initialOperationalReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                        Belum ada arsip laporan operasional yang diunggah. Klik &quot;Unggah Laporan Baru&quot; di atas untuk menambahkan.
                      </td>
                    </tr>
                  ) : (
                    initialOperationalReports.map((item) => {
                      const hasProof = Boolean(item.attachmentUrl || item.driveWebViewLink || item.driveFileId);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900">{item.title}</div>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-bold text-slate-800 uppercase px-2 py-0.5 rounded bg-slate-100 text-[11px]">
                              {item.reportType}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-800">
                            {item.department?.name || 'Umum / Operasional'}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-800">
                            {item.periodDate}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900">{item.uploadedBy?.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {item.uploadedBy?.position || 'Superintendent'}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {hasProof ? (
                              <button
                                type="button"
                                onClick={() => setPreviewReport(item)}
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
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {hasProof && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewReport(item)}
                                  className="text-xs font-bold text-[#1769AA] hover:text-[#0B3568] hover:underline cursor-pointer"
                                >
                                  Lihat Bukti
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteReport(item.id, item.title)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Hapus Laporan"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
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

      {/* Modal Unggah Laporan Baru */}
      {showUploadModal && (
        <Modal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title="Unggah Laporan Operasional (Google Drive)"
          eyebrow="DOCUMENT ARCHIVE & INTEGRATION"
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                form="report-upload-form"
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-[#0B3568] hover:bg-[#092B57] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{loading ? 'Menyimpan...' : 'Simpan Laporan'}</span>
              </button>
            </div>
          }
        >
          <form id="report-upload-form" onSubmit={handleCreateReport} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Judul Laporan *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: Laporan Penyaluran Gas &amp; Metering ORF — Shift Pagi"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-[#0B3568]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Jenis Laporan *</label>
                <select
                  value={form.reportType}
                  onChange={(e) => setForm({ ...form, reportType: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none"
                >
                  <option value="HARIAN">Laporan Harian ORF</option>
                  <option value="DISTRIBUSI_GAS">Penyaluran Distribusi Gas</option>
                  <option value="HSSE">Laporan HSSE &amp; Safety</option>
                  <option value="MAINTENANCE">Pemeliharaan &amp; Inspeksi</option>
                  <option value="BULANAN">Rekapitulasi Bulanan</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Departemen</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tanggal Periode *</label>
                <input
                  type="date"
                  required
                  value={form.periodDate}
                  onChange={(e) => setForm({ ...form, periodDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Keterangan / Ringkasan Laporan
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Tambahkan catatan atau ringkasan penting mengenai berkas laporan..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none"
              />
            </div>

            {/* Google Drive Upload Component */}
            <div className="pt-2 border-t border-slate-100">
              <FileUploadProof
                label="Unggah Berkas Laporan (PDF, PNG, JPG)"
                folderCategory="LAPORAN"
                departmentName={
                  departments.find((d) => d.id === form.departmentId)?.name || 'General'
                }
                subCategory={form.reportType}
                onFileUploaded={(meta) => {
                  if (meta) {
                    setForm({
                      ...form,
                      attachmentUrl: meta.attachmentUrl,
                      attachmentName: meta.attachmentName,
                      attachmentMime: meta.attachmentMime || '',
                      attachmentSize: meta.attachmentSize,
                      driveFileId: meta.driveFileId || '',
                      driveWebViewLink: meta.driveWebViewLink || '',
                    });
                  } else {
                    setForm({
                      ...form,
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

      {/* Modal Pratinjau Berkas Laporan */}
      {previewReport && (
        <Modal
          open={Boolean(previewReport)}
          onClose={() => setPreviewReport(null)}
          title="Pratinjau Berkas Laporan Operasional"
          eyebrow="GOOGLE DRIVE ARCHIVE"
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              {previewReport.driveWebViewLink || previewReport.attachmentUrl ? (
                <a
                  href={previewReport.driveWebViewLink || previewReport.attachmentUrl || '#'}
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
                onClick={() => setPreviewReport(null)}
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
                  Judul Laporan
                </span>
                <span className="font-bold text-slate-900">{previewReport.title}</span>
                <span className="text-slate-500 font-medium block text-[11px] mt-0.5">
                  Jenis: {previewReport.reportType} • Departemen: {previewReport.department?.name || 'Umum'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Tanggal Periode &amp; Pengunggah
                </span>
                <span className="font-bold text-slate-900 font-mono">{previewReport.periodDate}</span>
                <span className="text-slate-500 block text-[11px] mt-0.5">
                  Diunggah oleh: {previewReport.uploadedBy?.name}
                </span>
              </div>
              <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Nama Berkas Terarsip
                </span>
                <span className="font-bold text-slate-800">
                  {previewReport.attachmentName || 'Dokumen Laporan'}
                </span>
              </div>
            </div>

            {/* Embedded Preview */}
            {(previewReport.attachmentUrl?.match(/\.(jpg|jpeg|png|webp)/i) || previewReport.attachmentMime?.startsWith('image/')) ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 max-h-96 flex items-center justify-center bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewReport.attachmentUrl || previewReport.driveWebViewLink || ''}
                  alt="Bukti Laporan"
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
                  Struktur direktori: Distribusi Gas &amp; ORF / Laporan / {previewReport.periodDate.split('-')[0]} / {previewReport.department?.name || 'Umum'} / {previewReport.reportType}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
