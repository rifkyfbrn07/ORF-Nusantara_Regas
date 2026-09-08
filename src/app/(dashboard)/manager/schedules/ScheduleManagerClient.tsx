'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Copy,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  MapPin,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Modal } from '@/components/ui/Modal';
import {
  createScheduleAction,
  updateScheduleAction,
  deleteScheduleAction,
  duplicateScheduleAction,
} from '@/server/actions/scheduleActions';

export interface ScheduleManagerItem {
  id: string;
  userId: string;
  shiftId: string;
  locationId: string;
  date: string;
  status: string;
  notes?: string | null;
  user: {
    id: string;
    name: string;
    employeeId: string;
    position?: string | null;
    avatarUrl?: string | null;
  };
  shift: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
  location: {
    id: string;
    name: string;
  };
}

export interface ShiftManagerItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface OperatorManagerItem {
  id: string;
  name: string;
  employeeId: string;
  position?: string | null;
  avatarUrl?: string | null;
}

export interface LocationManagerItem {
  id: string;
  name: string;
}

interface ScheduleManagerClientProps {
  initialSchedules: ScheduleManagerItem[];
  shifts: ShiftManagerItem[];
  operators: OperatorManagerItem[];
  locations: LocationManagerItem[];
  today: string;
}

export function ScheduleManagerClient({
  initialSchedules,
  shifts,
  operators,
  locations,
  today,
}: ScheduleManagerClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedShift, setSelectedShift] = useState('ALL');
  const [selectedOperator, setSelectedOperator] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleManagerItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form States for Add / Edit
  const [formData, setFormData] = useState({
    userId: operators[0]?.id || '',
    shiftId: shifts[0]?.id || '',
    locationId: locations[0]?.id || '',
    date: today,
    status: 'WORK' as 'WORK' | 'OFF',
    notes: '',
  });

  // Duplicate Modal Form
  const [dupSourceDate, setDupSourceDate] = useState(today);
  const [dupTargetDate, setDupTargetDate] = useState(() => {
    const d = new Date(`${today}T00:00:00+07:00`);
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  });

  // Filtered schedules
  const filteredSchedules = initialSchedules.filter((s) => {
    const matchDate = viewMode === 'table' || s.date === selectedDate;
    const matchShift = selectedShift === 'ALL' || s.shiftId === selectedShift;
    const matchOperator = selectedOperator === 'ALL' || s.userId === selectedOperator;
    const matchSearch =
      search === '' ||
      s.user.name.toLowerCase().includes(search.toLowerCase()) ||
      s.user.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      (s.user.position && s.user.position.toLowerCase().includes(search.toLowerCase()));

    return matchDate && matchShift && matchOperator && matchSearch;
  });

  const handleOpenAdd = (defaultShiftId?: string) => {
    setEditingSchedule(null);
    setFormData({
      userId: operators[0]?.id || '',
      shiftId: defaultShiftId || shifts[0]?.id || '',
      locationId: locations[0]?.id || '',
      date: selectedDate,
      status: 'WORK',
      notes: '',
    });
    setError(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (sched: ScheduleManagerItem) => {
    setEditingSchedule(sched);
    setFormData({
      userId: sched.userId,
      shiftId: sched.shiftId,
      locationId: sched.locationId,
      date: sched.date,
      status: (sched.status === 'OFF' ? 'OFF' : 'WORK') as 'WORK' | 'OFF',
      notes: sched.notes || '',
    });
    setError(null);
    setShowAddModal(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingSchedule) {
        const res = await updateScheduleAction(editingSchedule.id, formData);
        if (!res.success) throw new Error(res.error);
        setSuccess('Jadwal kerja berhasil diperbarui!');
      } else {
        const res = await createScheduleAction(formData);
        if (!res.success) throw new Error(res.error);
        setSuccess('Jadwal kerja baru berhasil ditambahkan!');
      }
      setShowAddModal(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan jadwal');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (id: string, operatorName: string) => {
    if (!confirm(`Hapus jadwal untuk ${operatorName}?`)) return;
    setLoading(true);
    const res = await deleteScheduleAction(id);
    setLoading(false);
    if (res.success) {
      setSuccess('Jadwal berhasil dihapus.');
      router.refresh();
    } else {
      alert(res.error || 'Gagal menghapus jadwal');
    }
  };

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await duplicateScheduleAction(dupSourceDate, dupTargetDate);
    setLoading(false);
    if (res.success) {
      setSuccess(`Berhasil menduplikasi ${res.result?.count} jadwal ke tanggal ${dupTargetDate}!`);
      setShowDuplicateModal(false);
      setSelectedDate(dupTargetDate);
      router.refresh();
    } else {
      setError(res.error || 'Gagal menduplikasi jadwal.');
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

      {/* 1. Header: Manajemen Jadwal Kerja */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#0066B3] bg-[#EAF4FC] px-2.5 py-0.5 rounded-md">
            SHIFT PLANNING & DISPATCH
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F315A] tracking-tight mt-1">
            Manajemen Jadwal Kerja
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-0.5 max-w-2xl">
            Atur rotasi shift, penempatan operator, dan jadwal operasional fasilitas ORF Muara Karang.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setShowDuplicateModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-slate-200 text-[#0F315A] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5 text-[#0066B3]" />
            <span>Duplikasi Jadwal</span>
          </button>

          <button
            onClick={() => handleOpenAdd()}
            className="px-4 py-2 rounded-xl bg-[#0066B3] hover:bg-[#005596] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Tambah Jadwal</span>
          </button>
        </div>
      </div>

      {/* 2. Schedule Control Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: View Mode Toggle + Date Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-[#F1F5F9] p-1 rounded-xl border border-slate-200/80 text-xs font-bold">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'timeline'
                  ? 'bg-white text-[#0066B3] shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-[#0F315A]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Jadwal Harian (Timeline)</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'table'
                  ? 'bg-white text-[#0066B3] shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-[#0F315A]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Semua Jadwal (Tabel)</span>
            </button>
          </div>

          {/* Date Picker (in timeline mode) */}
          {viewMode === 'timeline' && (
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#CBD7E6] px-3 py-1.5 rounded-xl text-xs font-medium text-[#0F315A]">
              <Calendar className="w-3.5 h-3.5 text-[#0066B3]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent focus:outline-none font-bold text-xs cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Right: Filters & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Shift Filter */}
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
          >
            <option value="ALL">Semua Shift</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.startTime}–{s.endTime})
              </option>
            ))}
          </select>

          {/* Operator Filter */}
          <select
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value)}
            className="text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
          >
            <option value="ALL">Semua Operator</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>
                {op.name}
              </option>
            ))}
          </select>

          {/* Search Operator */}
          <div className="relative min-w-[160px] sm:min-w-[190px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari operator..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl text-[#0F172A] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20"
            />
          </div>
        </div>
      </div>

      {/* 3. Daily Timeline Mode (06:00 Pagi, 14:00 Siang, 22:00 Malam) */}
      {viewMode === 'timeline' ? (
        <div className="space-y-4">
          {shifts.map((shift) => {
            const shiftSchedules = filteredSchedules.filter((s) => s.shiftId === shift.id);

            return (
              <div
                key={shift.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-xs space-y-3"
              >
                {/* Shift Timeline Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="px-2.5 py-1 rounded-lg bg-[#0066B3] text-white text-xs font-black font-mono">
                      {shift.startTime} WIB
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#0F315A] uppercase">
                        {shift.name} ({shift.startTime} — {shift.endTime} WIB)
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {shiftSchedules.length} Operator Ditugaskan
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenAdd(shift.id)}
                    className="text-xs font-bold text-[#0066B3] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tugaskan Operator</span>
                  </button>
                </div>

                {/* Operator Cards Grid for this Shift */}
                {shiftSchedules.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-[#F8FAFC] rounded-xl border border-dashed border-slate-200">
                    Belum ada operator yang dijadwalkan pada {shift.name} untuk tanggal ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {shiftSchedules.map((s) => (
                      <div
                        key={s.id}
                        className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200/80 hover:bg-[#F1F5F9] transition flex flex-col justify-between group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              name={s.user.name}
                              avatarUrl={s.user.avatarUrl}
                              size={34}
                              className="ring-1 ring-slate-200 shrink-0"
                            />
                            <div>
                              <p className="text-xs font-bold text-[#0F315A] leading-tight">{s.user.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{s.user.position || 'Operator ORF'}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{s.user.employeeId}</p>
                            </div>
                          </div>

                          <StatusBadge
                            status={s.status === 'WORK' ? 'KERJA' : 'OFF'}
                            label={s.status === 'WORK' ? 'KERJA' : 'OFF'}
                            size="sm"
                          />
                        </div>

                        {/* Location & Time info */}
                        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-1 truncate max-w-[160px]">
                            <MapPin className="w-3 h-3 text-[#0066B3] shrink-0" />
                            <span className="truncate">{s.location.name}</span>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleOpenEdit(s)}
                              title="Ubah Jadwal"
                              className="p-1 rounded-lg hover:bg-white hover:text-[#0066B3] text-slate-500 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(s.id, s.user.name)}
                              title="Hapus Jadwal"
                              className="p-1 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-500 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* 4. Table Mode (Desktop Table + Mobile Card List) */
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0F172A]">
              <thead className="text-[10px] uppercase font-bold text-[#64748B] bg-[#EDF4FB] border-b border-slate-200 sticky top-0">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Tanggal</th>
                  <th scope="col" className="px-5 py-3.5">Operator</th>
                  <th scope="col" className="px-4 py-3.5">Shift</th>
                  <th scope="col" className="px-4 py-3.5">Jam Kerja</th>
                  <th scope="col" className="px-4 py-3.5">Lokasi</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Status</th>
                  <th scope="col" className="px-4 py-3.5">Catatan</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-400 text-xs">
                      Tidak ada jadwal kerja yang ditemukan untuk kriteria filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F8FBFE] transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-[#0F315A]">
                        {s.date}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={s.user.name} avatarUrl={s.user.avatarUrl} size={28} />
                          <div>
                            <p className="font-bold text-[#0F315A] leading-tight">{s.user.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{s.user.employeeId} · {s.user.position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-[#0F172A]">
                        {s.shift.name}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 text-[11px]">
                        {s.shift.startTime} – {s.shift.endTime} WIB
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {s.location.name}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={s.status} label={s.status === 'WORK' ? 'KERJA' : 'OFF'} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-slate-500 italic max-w-xs truncate">
                        {s.notes || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            title="Ubah Jadwal"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-[#EAF4FC] hover:text-[#0066B3] text-slate-600 transition cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(s.id, s.user.name)}
                            title="Hapus Jadwal"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (< 768px: Strict No Horizontal Scroll) */}
          <div className="md:hidden divide-y divide-slate-100 p-3 space-y-2">
            {filteredSchedules.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Tidak ada jadwal kerja yang sesuai dengan kriteria filter.
              </div>
            ) : (
              filteredSchedules.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={s.user.name} avatarUrl={s.user.avatarUrl} size={32} />
                      <div>
                        <p className="font-bold text-xs text-[#0F315A]">{s.user.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{s.user.employeeId} · {s.user.position}</p>
                      </div>
                    </div>
                    <StatusBadge status={s.status} label={s.status === 'WORK' ? 'KERJA' : 'OFF'} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Shift:</span>
                      <span className="font-bold text-[#0F172A]">{s.shift.name} ({s.shift.startTime}–{s.shift.endTime})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Lokasi:</span>
                      <span className="font-bold text-slate-700">{s.location.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                    <span className="font-mono text-slate-500 font-bold">{s.date}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]"
                      >
                        Ubah
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(s.id, s.user.name)}
                        className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 font-bold text-[11px]"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. Standardized Add/Edit Modal (Sticky Header, Scrollable Body, Sticky Footer) */}
      {showAddModal && (
        <Modal
          open
          onClose={() => setShowAddModal(false)}
          size="md"
          eyebrow="SHIFT ASSIGNMENT"
          title={editingSchedule ? 'Ubah Penugasan Jadwal Kerja' : 'Tambah Jadwal Kerja Baru'}
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="schedule-form"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold bg-[#0066B3] hover:bg-[#005596] text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                {loading ? 'Menyimpan...' : 'Simpan Jadwal'}
              </button>
            </div>
          }
        >
            {/* Modal Scrollable Body */}
            <form id="schedule-form" onSubmit={handleSaveSchedule} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Operator</label>
                <select
                  disabled={!!editingSchedule}
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 font-medium"
                >
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name} ({op.employeeId}) — {op.position}
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
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0F172A] block mb-1">Status Penugasan</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'WORK' | 'OFF' })}
                    className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none font-bold text-[#0F172A]"
                  >
                    <option value="WORK">KERJA (Aktif Bertugas)</option>
                    <option value="OFF">OFF (Libur Rotasi)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Shift Kerja</label>
                <select
                  value={formData.shiftId}
                  onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none font-medium"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} — {s.endTime} WIB)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Lokasi Fasilitas</label>
                <select
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none font-medium"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Catatan Supervisi (Opsional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contoh: Primary Control Room Officer..."
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            </form>
        </Modal>
      )}

      {/* 6. Standardized Duplicate Modal */}
      {showDuplicateModal && (
        <Modal
          open
          onClose={() => setShowDuplicateModal(false)}
          size="sm"
          eyebrow="DUPLIKASI"
          title="Duplikasi Jadwal Harian"
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                form="dup-form"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold bg-[#0066B3] hover:bg-[#005596] text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                {loading ? 'Menduplikasi...' : 'Duplikasi Sekarang'}
              </button>
            </div>
          }
        >
            <form id="dup-form" onSubmit={handleDuplicate} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Salin seluruh alokasi operator dan rotasi shift dari tanggal sumber ke tanggal target secara otomatis.
              </p>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Tanggal Sumber (Asal)</label>
                <input
                  type="date"
                  required
                  value={dupSourceDate}
                  onChange={(e) => setDupSourceDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none font-bold font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] block mb-1">Tanggal Tujuan (Target)</label>
                <input
                  type="date"
                  required
                  value={dupTargetDate}
                  onChange={(e) => setDupTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl focus:outline-none font-bold font-mono"
                />
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
