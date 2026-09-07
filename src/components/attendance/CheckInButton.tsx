'use client';

import React, { useState } from 'react';
import { LogIn, LogOut, CheckCircle, MapPin, AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { checkInAction, checkOutAction } from '@/server/actions/attendanceActions';
import { formatJakartaTime } from '@/lib/time';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface CheckInButtonProps {
  statusData: {
    status: string;
    statusLabel: string;
    shift: {
      id: string;
      name: string;
      code: string;
      startTime: string;
      endTime: string;
    } | null;
    location: {
      id: string;
      name: string;
    } | null;
    attendance: {
      id: string;
      checkIn: Date | null;
      checkOut: Date | null;
      lateMinutes: number;
      notes: string | null;
    } | null;
    leave: {
      type: string;
      reason: string;
    } | null;
    scheduleId: string | null;
    isWorkDay: boolean;
    canCheckIn: boolean;
    canCheckOut: boolean;
  };
}

export function CheckInButton({ statusData }: CheckInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { status, statusLabel, shift, location, attendance, leave, scheduleId, canCheckIn, canCheckOut } = statusData;

  const handleCheckIn = async () => {
    if (!scheduleId) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await checkInAction({
      scheduleId,
      location: location?.name || 'ORF Muara Karang (GPS Synced)',
      notes: notes.trim() || undefined,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Gagal melakukan check-in.');
    } else {
      setSuccessMsg('Check-in berhasil dicatat oleh server!');
    }
  };

  const handleCheckOut = async () => {
    if (!attendance?.id) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await checkOutAction({
      attendanceId: attendance.id,
      notes: notes.trim() || undefined,
    });

    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Gagal melakukan check-out.');
    } else {
      setSuccessMsg('Check-out berhasil dicatat. Selamat beristirahat!');
    }
  };

  // Case 1: Operator is OFF
  if (status === 'OFF') {
    return (
      <div className="bg-white rounded-2xl p-6 border border-[#DCE6F2] shadow-xs text-center">
        <div className="h-14 w-14 rounded-full bg-slate-100 text-[#64748B] flex items-center justify-center mx-auto mb-3">
          <Clock className="h-7 w-7" />
        </div>
        <span className="text-xs font-bold text-[#64748B] uppercase tracking-widest block">STATUS HARI INI</span>
        <h2 className="text-2xl font-black text-[#0F2F63] mt-1">HARI INI — OFF</h2>
        <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-2">
          Anda tidak memiliki jadwal kerja operasional hari ini. Manfaatkan waktu istirahat Anda dengan baik.
        </p>
      </div>
    );
  }

  // Case 2: Operator is on Approved Leave / Permission / Sick
  if (status === 'CUTI' || status === 'IZIN' || status === 'SAKIT') {
    return (
      <div className="bg-white rounded-2xl p-6 border border-[#DCE6F2] shadow-xs text-center">
        <div className="h-14 w-14 rounded-full bg-[#EAF0F8] text-[#123E7A] flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <span className="text-xs font-bold text-[#64748B] uppercase tracking-widest block">STATUS HARI INI</span>
        <h2 className="text-2xl font-black text-[#123E7A] mt-1">HARI INI — {statusLabel}</h2>
        <p className="text-xs text-[#172033] max-w-sm mx-auto mt-2 font-medium">
          Pengajuan {statusLabel} Anda telah disetujui: &ldquo;{leave?.reason || 'Izin terverifikasi'}&rdquo;
        </p>
        <p className="text-[11px] text-[#64748B] mt-1">
          Anda dibebaskan dari kewajiban check-in absensi hari ini.
        </p>
      </div>
    );
  }

  // Case 3: Operator is Scheduled to WORK
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#DCE6F2] shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">STATUS JADWAL</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              KERJA HARI INI
            </span>
          </div>
          <h2 className="text-2xl font-black text-[#0F2F63] mt-1">
            {shift?.name || 'Shift Operasional'}
          </h2>
          <div className="flex items-center gap-4 text-xs text-[#64748B] mt-1">
            <span className="font-bold text-[#1D5FA7] font-mono">
              {shift?.startTime} — {shift?.endTime} WIB
            </span>
            <span>•</span>
            <div className="flex items-center gap-1 text-[#64748B]">
              <MapPin className="h-3.5 w-3.5 text-[#F58220]" />
              <span>{location?.name || 'ORF Muara Karang'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={status} label={statusLabel} size="lg" />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Action Section */}
      <div className="mt-6">
        {canCheckIn && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#172033] block mb-1">
                Catatan Sebelum Bertugas (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Kondisi fit, siap bertugas di Control Room..."
                className="w-full px-3 py-2 text-xs bg-[#F8FBFF] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123E7A]/20 focus:border-[#123E7A] text-[#172033]"
              />
            </div>

            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-[#123E7A] hover:bg-[#0F2F63] text-white font-black text-base tracking-wide flex items-center justify-center gap-2 shadow-md shadow-[#0F2F63]/15 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="h-5 w-5" />
              <span>{loading ? 'MEMPROSES ABSENSI...' : 'CHECK IN SEKARANG'}</span>
            </button>
            <p className="text-[11px] text-[#64748B] text-center font-medium">
              Waktu absensi akan dicatat secara otomatis sesuai waktu server (WIB)
            </p>
          </div>
        )}

        {attendance?.checkIn && !attendance.checkOut && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Check-In Terverifikasi</span>
                <p className="text-sm font-black text-emerald-900 mt-0.5 font-mono">
                  {formatJakartaTime(attendance.checkIn)} WIB
                </p>
                {attendance.notes && (
                  <p className="text-[11px] text-emerald-800 mt-1 italic">&ldquo;{attendance.notes}&rdquo;</p>
                )}
              </div>
              <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0" />
            </div>

            {canCheckOut && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-[#172033] block mb-1">
                    Catatan Akhir Shift (Opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Operasi normal, handover selesai..."
                    className="w-full px-3 py-2 text-xs bg-[#F8FBFF] border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123E7A]/20 focus:border-[#123E7A] text-[#172033]"
                  />
                </div>

                <button
                  onClick={handleCheckOut}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-[#0F2F63] hover:bg-[#0A1F42] text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <LogOut className="h-4 w-4 text-[#F58220]" />
                  <span>{loading ? 'MEMPROSES...' : 'CHECK OUT SELESAI SHIFT'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {attendance?.checkIn && attendance?.checkOut && (
          <div className="p-4 bg-[#F8FAFC] border border-[#DCE6F2] rounded-xl text-center">
            <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-sm font-black text-[#0F2F63]">Shift Hari Ini Telah Selesai</h4>
            <div className="flex items-center justify-center gap-6 text-xs text-[#64748B] mt-2 font-mono">
              <span>Masuk: <b className="text-[#172033]">{formatJakartaTime(attendance.checkIn)} WIB</b></span>
              <span>Keluar: <b className="text-[#172033]">{formatJakartaTime(attendance.checkOut)} WIB</b></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
