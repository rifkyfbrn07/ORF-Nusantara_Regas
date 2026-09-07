'use client';

import React, { useState } from 'react';
import { Megaphone, CheckCircle, AlertCircle, X, Power } from 'lucide-react';
import {
  createAnnouncementAction,
  deactivateAnnouncementAction,
} from '@/server/actions/announcementActions';

interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  priority: string;
  targetType: string;
  targetId: string | null;
  startAt: string;
  endAt: string | null;
  isActive: boolean;
  createdByName: string;
  createdAt: string;
}

interface AnnouncementsClientProps {
  announcements: AnnouncementRow[];
  shifts: Array<{ id: string; name: string }>;
  operators: Array<{ id: string; name: string; employeeId: string }>;
  todayStr: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  NORMAL: 'bg-slate-100 text-slate-700 border-slate-200',
  IMPORTANT: 'bg-amber-50 text-amber-700 border-amber-300',
  URGENT: 'bg-red-50 text-red-700 border-red-300',
};

const TARGET_LABELS: Record<string, string> = {
  ALL: 'Semua Operator',
  SHIFT: 'Shift Tertentu',
  OPERATOR: 'Operator Tertentu',
};

export function AnnouncementsClient({ announcements, shifts, operators, todayStr }: AnnouncementsClientProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'NORMAL',
    targetType: 'ALL',
    targetId: '',
    startAt: todayStr,
    endAt: '',
  });

  const targetLabel = (row: AnnouncementRow) => {
    if (row.targetType === 'ALL') return 'Semua Operator';
    if (row.targetType === 'SHIFT') return shifts.find((s) => s.id === row.targetId)?.name || 'Shift';
    return operators.find((o) => o.id === row.targetId)?.name || 'Operator';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const res = await createAnnouncementAction({
      title: form.title,
      message: form.message,
      priority: form.priority as 'NORMAL' | 'IMPORTANT' | 'URGENT',
      targetType: form.targetType as 'ALL' | 'SHIFT' | 'OPERATOR',
      targetId: form.targetType === 'ALL' ? undefined : form.targetId || undefined,
      startAt: form.startAt,
      endAt: form.endAt || undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Gagal membuat pengumuman.');
    } else {
      setSuccessMsg('Pengumuman berhasil diterbitkan & notifikasi terkirim.');
      setForm({ title: '', message: '', priority: 'NORMAL', targetType: 'ALL', targetId: '', startAt: todayStr, endAt: '' });
      setShowForm(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    await deactivateAnnouncementAction(id);
    setSuccessMsg('Pengumuman dinonaktifkan.');
  };

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="anim-fade-up p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between">
          <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} aria-label="Tutup"><X className="h-4 w-4" /></button>
        </div>
      )}
      {error && (
        <div className="anim-fade-up p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 font-medium">
          {announcements.filter((a) => a.isActive).length} pengumuman aktif
        </p>
        <button onClick={() => setShowForm((v) => !v)} className="button-secondary flex items-center gap-2 text-xs">
          <Megaphone className="h-4 w-4" />
          {showForm ? 'Tutup Formulir' : 'Buat Pengumuman'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="anim-fade-up panel p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Judul</label>
              <input type="text" required value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: Safety briefing wajib diikuti seluruh operator"
                className="field w-full text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Pesan</label>
              <textarea required rows={3} value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Tulis isi pengumuman..."
                className="field w-full text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Prioritas</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="field w-full text-sm">
                <option value="NORMAL">NORMAL</option>
                <option value="IMPORTANT">IMPORTANT</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Target</label>
              <select value={form.targetType}
                onChange={(e) => setForm({ ...form, targetType: e.target.value, targetId: '' })}
                className="field w-full text-sm">
                <option value="ALL">ALL OPERATORS</option>
                <option value="SHIFT">SPECIFIC SHIFT</option>
                <option value="OPERATOR">SPECIFIC OPERATOR</option>
              </select>
            </div>
            {form.targetType === 'SHIFT' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Shift</label>
                <select required value={form.targetId}
                  onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                  className="field w-full text-sm">
                  <option value="">— Pilih shift —</option>
                  {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            {form.targetType === 'OPERATOR' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Operator</label>
                <select required value={form.targetId}
                  onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                  className="field w-full text-sm">
                  <option value="">— Pilih operator —</option>
                  {operators.map((o) => (
                    <option key={o.id} value={o.id}>{o.name} ({o.employeeId})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mulai Tayang</label>
              <input type="date" required value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                className="field w-full text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Selesai (opsional)</label>
              <input type="date" value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                className="field w-full text-sm" />
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button type="submit" disabled={loading}
              className="px-5 py-2 bg-[#123E7A] hover:bg-[#0F2F63] text-white font-bold text-xs rounded-xl transition disabled:opacity-50">
              {loading ? 'Menerbitkan...' : 'Terbitkan Pengumuman'}
            </button>
          </div>
        </form>
      )}

      {/* Announcement list */}
      <section className="panel overflow-hidden">
        {announcements.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Belum ada pengumuman dibuat.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {announcements.map((row, i) => (
              <li key={row.id} style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                className="anim-fade-up p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-slate-50/70 transition">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{row.title}</h3>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${PRIORITY_STYLES[row.priority] || PRIORITY_STYLES.NORMAL}`}>
                      {row.priority}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${row.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                      {row.isActive ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{row.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Target: <b>{TARGET_LABELS[row.targetType]}{row.targetType !== 'ALL' && ` — ${targetLabel(row)}`}</b>
                    {' · '}Periode: {row.startAt.slice(0, 10)} s/d {row.endAt ? row.endAt.slice(0, 10) : '—'}
                    {' · '}oleh {row.createdByName}
                  </p>
                </div>

                {row.isActive && (
                  <button onClick={() => handleDeactivate(row.id)} title="Nonaktifkan pengumuman"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:border-red-300 hover:text-red-600 transition">
                    <Power className="h-3.5 w-3.5" />
                    Nonaktifkan
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}