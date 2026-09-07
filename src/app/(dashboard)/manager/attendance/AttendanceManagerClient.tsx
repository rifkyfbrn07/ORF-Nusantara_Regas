'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  Edit3,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Clock,
  CheckCircle,
  AlertOctagon,
  ClockAlert,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { formatJakartaTime } from '@/lib/time';
import { manualCorrectionAction } from '@/server/actions/attendanceActions';

export interface AttendanceRecordItem {
  id: string;
  userId: string;
  date: string;
  status: string;
  checkIn?: Date | string | null;
  checkOut?: Date | string | null;
  lateMinutes: number;
  checkInLocation?: string | null;
  notes?: string | null;
  user: {
    id: string;
    name: string;
    employeeId: string;
    avatarUrl?: string | null;
  };
  schedule?: {
    shiftId: string;
    shift?: {
      id: string;
      name: string;
    } | null;
    location?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface AttendanceShiftItem {
  id: string;
  name: string;
}

export interface AttendanceOperatorItem {
  id: string;
  name: string;
  employeeId: string;
}

interface AttendanceManagerClientProps {
  initialRecords: AttendanceRecordItem[];
  shifts: AttendanceShiftItem[];
  operators: AttendanceOperatorItem[];
  today: string;
}

export function AttendanceManagerClient({
  initialRecords,
  shifts,
  operators,
  today,
}: AttendanceManagerClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Manual correction modal state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecordItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    attendanceId: '',
    userId: operators[0]?.id || '',
    date: today,
    checkInTime: '06:00',
    checkOutTime: '14:00',
    status: 'HADIR' as 'HADIR' | 'TERLAMBAT' | 'BELUM_ABSEN' | 'ABSENT' | 'IZIN' | 'CUTI' | 'SAKIT',
    notes: '',
  });

  const filteredRecords = initialRecords.filter((r) => {
    const matchSearch =
      search === '' ||
      r.user.name.toLowerCase().includes(search.toLowerCase()) ||
      r.user.employeeId.toLowerCase().includes(search.toLowerCase());

    const matchShift =
      shiftFilter === 'ALL' ||
      r.schedule?.shiftId === shiftFilter;

    const matchStatus =
      statusFilter === 'ALL' ||
      r.status === statusFilter;

    const matchDate =
      dateFilter === '' ||
      r.date === dateFilter;

    return matchSearch && matchShift && matchStatus && matchDate;
  });

  // Calculate quick metrics
  const totalCount = initialRecords.length;
  const hadirCount = initialRecords.filter((r) => r.status === 'HADIR').length;
  const terlambatCount = initialRecords.filter((r) => r.status === 'TERLAMBAT').length;
  const belumAbsenCount = initialRecords.filter((r) => r.status === 'BELUM_ABSEN').length;

  const handleOpenCorrection = (record?: AttendanceRecordItem) => {
    setError(null);
    if (record) {
      setSelectedRecord(record);
      setFormData({
        attendanceId: record.id,
        userId: record.userId,
        date: record.date,
        checkInTime: record.checkIn ? formatJakartaTime(record.checkIn) : '06:00',
        checkOutTime: record.checkOut ? formatJakartaTime(record.checkOut) : '',
        status: (record.status || 'HADIR') as 'HADIR' | 'TERLAMBAT' | 'BELUM_ABSEN' | 'ABSENT' | 'IZIN' | 'CUTI' | 'SAKIT',
        notes: record.notes || '',
      });
    } else {
      setSelectedRecord(null);
      setFormData({
        attendanceId: '',
        userId: operators[0]?.id || '',
        date: today,
        checkInTime: '06:00',
        checkOutTime: '14:00',
        status: 'HADIR',
        notes: '',
      });
    }
    setShowCorrectionModal(true);
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await manualCorrectionAction(formData);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Gagal menyimpan koreksi absensi.');
    } else {
      setSuccess('Koreksi absensi berhasil disimpan dan dicatat dalam audit trail operasional.');
      setShowCorrectionModal(false);
      router.refresh();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 dashboard-enter max-w-[1400px] mx-auto w-full">
      {/* Alert Notification */}
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-[#0F315A] text-white rounded-xl p-3 sm:p-3.5 shadow-xs flex flex-col justify-between h-[88px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-200">
            <Clock className="w-3.5 h-3.5 text-[#0066B3]" />
            <span>TOTAL REKAMAN</span>
          </div>
          <div className="text-2xl font-black text-white leading-none">{totalCount}</div>
          <span className="text-[9.5px] text-slate-300">Data terdata bulan ini</span>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-[88px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>HADIR TEPAT WAKTU</span>
          </div>
          <div className="text-2xl font-black text-[#0F172A] leading-none">{hadirCount}</div>
          <span className="text-[9.5px] text-slate-400">Presensi normal</span>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-[88px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 uppercase">
            <AlertOctagon className="w-3.5 h-3.5 text-[#F58220]" />
            <span>TERLAMBAT</span>
          </div>
          <div className="text-2xl font-black text-[#0F172A] leading-none">{terlambatCount}</div>
          <span className="text-[9.5px] text-slate-400">Melewati toleransi</span>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-[#E2E8F0] shadow-xs flex flex-col justify-between h-[88px]">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-700 uppercase">
            <ClockAlert className="w-3.5 h-3.5 text-[#DC2626]" />
            <span>BELUM ABSEN</span>
          </div>
          <div className="text-2xl font-black text-[#0F172A] leading-none">{belumAbsenCount}</div>
          <span className="text-[9.5px] text-slate-400">Menunggu check in</span>
        </div>
      </div>

      {/* 2. Filter and Export Control Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD7E6] px-3 py-1.5 rounded-xl text-xs font-medium text-[#0F315A]">
            <Calendar className="h-3.5 w-3.5 text-[#0066B3]" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent focus:outline-none font-bold text-xs cursor-pointer"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-[10px] text-red-600 font-bold hover:underline ml-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Shift Filter */}
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
          >
            <option value="ALL">Semua Shift</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
          >
            <option value="ALL">Semua Status</option>
            <option value="HADIR">HADIR</option>
            <option value="TERLAMBAT">TERLAMBAT</option>
            <option value="BELUM_ABSEN">BELUM ABSEN</option>
            <option value="CUTI">CUTI</option>
            <option value="IZIN">IZIN</option>
            <option value="SAKIT">SAKIT</option>
          </select>

          {/* Search Operator */}
          <div className="relative min-w-[160px] sm:min-w-[190px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau NIP..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <a
            href="/api/export/attendance?startDate=2026-09-01&endDate=2026-09-30"
            download
            className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-slate-200 text-[#0F315A] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#0066B3]" />
            <span>Ekspor CSV</span>
          </a>

          <button
            onClick={() => handleOpenCorrection()}
            className="px-4 py-2 rounded-xl bg-[#0066B3] hover:bg-[#005596] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Koreksi Manual</span>
          </button>
        </div>
      </div>

      {/* 3. Attendance Table (Desktop Table + Mobile Card List) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="text-[10px] uppercase font-bold text-[#64748B] bg-[#EDF4FB] border-b border-slate-200">
              <tr>
                <th scope="col" className="px-5 py-3.5">Tanggal</th>
                <th scope="col" className="px-5 py-3.5">Operator</th>
                <th scope="col" className="px-4 py-3.5">Shift</th>
                <th scope="col" className="px-4 py-3.5 text-center">Status</th>
                <th scope="col" className="px-4 py-3.5">Check In</th>
                <th scope="col" className="px-4 py-3.5">Check Out</th>
                <th scope="col" className="px-4 py-3.5">Terlambat</th>
                <th scope="col" className="px-4 py-3.5">Lokasi / Catatan</th>
                <th scope="col" className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400 text-xs">
                    Tidak ada rekaman absensi yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const checkInTime = formatJakartaTime(r.checkIn);
                  const checkOutTime = formatJakartaTime(r.checkOut);

                  return (
                    <tr key={r.id} className="hover:bg-[#F8FBFE] transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-[#0F315A]">
                        {r.date}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={r.user.name} avatarUrl={r.user.avatarUrl} size={28} />
                          <div>
                            <p className="font-bold text-[#0F315A] leading-tight">{r.user.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{r.user.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-[#0F172A]">
                        {r.schedule?.shift?.name || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 font-mono">
                        {checkInTime !== '—' ? (
                          <span className={`font-bold ${r.status === 'TERLAMBAT' ? 'text-amber-600' : 'text-slate-800'}`}>
                            {checkInTime} WIB
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono">
                        {checkOutTime !== '—' ? (
                          <span className="font-bold text-slate-800">{checkOutTime} WIB</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {r.lateMinutes > 0 ? (
                          <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                            +{r.lateMinutes} menit
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[11px]">
                        <div className="text-slate-700 font-medium truncate max-w-xs">
                          {r.checkInLocation || r.schedule?.location?.name || 'ORF Muara Karang'}
                        </div>
                        {r.notes && (
                          <div className="text-slate-400 italic truncate max-w-xs mt-0.5">
                            &ldquo;{r.notes}&rdquo;
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleOpenCorrection(r)}
                          className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-[#EAF4FC] hover:text-[#0066B3] text-slate-700 font-bold text-[11px] transition cursor-pointer"
                        >
                          Koreksi
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View (< 768px: Strict No Horizontal Scroll) */}
        <div className="md:hidden divide-y divide-slate-100 p-3 space-y-2">
          {filteredRecords.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Tidak ada rekaman absensi yang sesuai filter.
            </div>
          ) : (
            filteredRecords.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={r.user.name} avatarUrl={r.user.avatarUrl} size={32} />
                    <div>
                      <p className="font-bold text-xs text-[#0F315A]">{r.user.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{r.user.employeeId}</p>
                    </div>
                  </div>
                  <StatusBadge status={r.status} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Tanggal & Shift:</span>
                    <span className="font-bold text-[#0F172A]">{r.date} · {r.schedule?.shift?.name || 'Shift'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Check In:</span>
                    <span className="font-bold text-slate-700 font-mono">
                      {r.checkIn ? `${formatJakartaTime(r.checkIn)} WIB` : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                  <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {r.checkInLocation || 'ORF Muara Karang'}
                  </span>
                  <button
                    onClick={() => handleOpenCorrection(r)}
                    className="px-3 py-1 rounded-lg bg-[#EAF4FC] text-[#0066B3] font-bold text-[11px]"
                  >
                    Koreksi
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Standardized Correction Modal (Sticky Header, Scrollable Body, Sticky Footer) */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 anim-fade">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100vh-32px)] overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4.5 w-4.5 text-[#0066B3]" />
                <h3 className="font-extrabold text-sm sm:text-base text-[#0F315A]">
                  {selectedRecord ? 'Koreksi Data Absensi Operator' : 'Input Absensi Manual'}
                </h3>
              </div>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form id="correction-form" onSubmit={handleSubmitCorrection} className="p-5 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Operator</label>
                <select
                  disabled={!!selectedRecord}
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none font-medium"
                >
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name} ({op.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    disabled={!!selectedRecord}
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Status Kehadiran</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as
                          | 'HADIR'
                          | 'TERLAMBAT'
                          | 'BELUM_ABSEN'
                          | 'ABSENT'
                          | 'IZIN'
                          | 'CUTI'
                          | 'SAKIT',
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none font-bold text-[#0F172A]"
                  >
                    <option value="HADIR">HADIR</option>
                    <option value="TERLAMBAT">TERLAMBAT</option>
                    <option value="BELUM_ABSEN">BELUM ABSEN</option>
                    <option value="ABSENT">ABSENT / MANGKIR</option>
                    <option value="IZIN">IZIN</option>
                    <option value="CUTI">CUTI</option>
                    <option value="SAKIT">SAKIT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Jam Masuk (WIB)</label>
                  <input
                    type="time"
                    value={formData.checkInTime}
                    onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Jam Keluar (WIB)</label>
                  <input
                    type="time"
                    value={formData.checkOutTime}
                    onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">
                  Alasan Koreksi Supervisi (Wajib Diisi)
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contoh: Kendala jaringan koneksi mobile saat check in di ORF..."
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            </form>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2 bg-[#F8FAFC] shrink-0">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="correction-form"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold bg-[#0066B3] hover:bg-[#005596] text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                {loading ? 'Menyimpan...' : 'Simpan Koreksi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
