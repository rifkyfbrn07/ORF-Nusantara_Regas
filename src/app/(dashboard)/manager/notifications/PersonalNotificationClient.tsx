'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, CheckCircle2, AlertCircle, BellRing, Users } from 'lucide-react';
import { sendPersonalNotificationAction } from '@/server/actions/scheduleBulkActions';

interface Recipient {
  id: string;
  label: string;
  role: string;
}

interface RecentItem {
  id: string;
  title: string;
  message: string;
  userName: string;
  isRead: boolean;
  createdAt: string;
}

export function PersonalNotificationClient({
  senderRole,
  recipients,
  recent,
}: {
  senderRole: 'ADMIN' | 'MANAGER';
  recipients: Recipient[];
  recent: RecentItem[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [allOperators, setAllOperators] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      recipients.filter(
        (r) =>
          search.trim().length === 0 ||
          r.label.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [recipients, search]
  );

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const recipientIds = allOperators ? ['ALL_OPERATORS'] : selected;
    if (recipientIds.length === 0) {
      setError('Pilih minimal satu penerima, atau aktifkan "Seluruh Operator".');
      return;
    }
    setLoading(true);
    try {
      const res = await sendPersonalNotificationAction({
        recipientIds,
        title,
        message,
        link: '/notifications',
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSuccess(`Notifikasi terkirim ke ${res.sent} penerima.`);
      setTitle('');
      setMessage('');
      setSelected([]);
      setAllOperators(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <form
        onSubmit={handleSend}
        className="lg:col-span-2 bg-white rounded-xl border border-[#DCE5EF] shadow-xs p-5 space-y-4 h-fit"
      >
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg bg-[#EAF4FC] text-[#0066B3] flex items-center justify-center">
            <BellRing className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-black text-[#092B57]">Kirim Notifikasi</div>
            <div className="text-[10px] font-semibold text-slate-400">
              {senderRole === 'MANAGER' ? 'Scope: operator saja' : 'Scope: semua pengguna'}
            </div>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs font-bold text-[#0B3568] bg-[#F8FBFE] border border-[#E2E8F0] rounded-lg px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allOperators}
              onChange={(e) => setAllOperators(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-[#0066B3] focus:ring-[#0066B3]/20"
            />
            <Users className="h-3.5 w-3.5 text-[#0066B3]" />
            Kirim ke Seluruh Operator (aktif)
          </label>
        </div>

        {!allOperators && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
              Penerima ({selected.length} dipilih)
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari username / nama..."
              className="field w-full mb-1.5"
            />
            <div className="max-h-48 overflow-y-auto rounded-lg border border-[#E2E8F0] divide-y divide-[#F1F5F9]">
              {filtered.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() => toggle(r.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#0066B3] focus:ring-[#0066B3]/20"
                  />
                  <span className="text-[11px] font-semibold text-slate-700 truncate">{r.label}</span>
                </label>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-3 text-[11px] text-slate-400 text-center">Tidak ada hasil.</div>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Judul</label>
          <input
            type="text"
            className="field w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="cth. Undangan Safety Briefing"
            required
            minLength={3}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Pesan</label>
          <textarea
            className="field w-full"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tulis isi pemberitahuan..."
            required
            minLength={5}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs font-semibold text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2.5 text-xs font-black rounded-lg bg-[#123B6D] text-white hover:bg-[#0F315A] disabled:opacity-60 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Kirim Notifikasi
        </button>
      </form>

      {/* Riwayat (khusus admin) */}
      {senderRole === 'ADMIN' && (
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#DCE5EF] shadow-xs overflow-hidden h-fit">
          <div className="px-5 py-3.5 border-b border-[#EDF2F7]">
            <div className="text-sm font-black text-[#092B57]">Notifikasi Terakhir (Seluruh Sistem)</div>
            <div className="text-[10px] font-semibold text-slate-400">30 notifikasi terbaru</div>
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-[#F1F5F9]">
            {recent.length === 0 && (
              <div className="px-5 py-8 text-center text-xs text-slate-400">Belum ada notifikasi.</div>
            )}
            {recent.map((n) => (
              <div key={n.id} className="px-5 py-3 flex items-start gap-3 hover:bg-[#F8FBFE]">
                <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.isRead ? 'bg-slate-300' : 'bg-[#E1251B]'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0B3568] truncate">{n.title}</span>
                    <span className="text-[9.5px] text-slate-400 shrink-0">
                      {new Date(n.createdAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                  <span className="text-[10px] font-semibold text-[#1769AA]">Untuk: {n.userName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
