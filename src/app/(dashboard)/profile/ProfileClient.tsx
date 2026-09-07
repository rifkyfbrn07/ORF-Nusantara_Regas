'use client';

import React, { useRef, useState } from 'react';
import { Save, CheckCircle, AlertCircle, X, Camera, Trash2 } from 'lucide-react';
import { updateProfileAction } from '@/server/actions/profileActions';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface ProfileUser {
  name: string;
  email: string;
  role: string;
  employeeId: string;
  phone?: string | null;
  avatarUrl?: string | null;
  department?: { name: string } | null;
}

interface ProfileClientProps {
  user: ProfileUser;
}

/** Reads an image File and returns a square-cropped JPEG data URL (max 256px) */
async function fileToAvatarDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Gagal membaca berkas foto.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Berkas bukan gambar yang valid.'));
    image.src = dataUrl;
  });

  const SIZE = 256;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  // Square center-crop
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // undefined = unchanged; string = new photo (data URL) or '' = remove photo
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewAvatarUrl =
    avatarDataUrl === undefined ? user.avatarUrl : avatarDataUrl === '' ? null : avatarDataUrl;

  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        setError('Kata sandi baru minimal 6 karakter.');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError('Konfirmasi kata sandi baru tidak cocok.');
        return;
      }
      if (!formData.currentPassword) {
        setError('Kata sandi saat ini wajib diisi untuk mengubah kata sandi baru.');
        return;
      }
    }

    setLoading(true);

    const res = await updateProfileAction({
      name: formData.name,
      phone: formData.phone.trim() || undefined,
      ...(avatarDataUrl !== undefined ? { avatarUrl: avatarDataUrl } : {}),
      currentPassword: formData.currentPassword || undefined,
      newPassword: formData.newPassword || undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Gagal memperbarui profil.');
    } else {
      setSuccess('Profil dan keamanan akun berhasil diperbarui.');
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      router.refresh();
    }
  };

  const handleAvatarSelected = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setSuccess(null);

    if (!file.type.startsWith('image/')) {
      setError('Berkas harus berupa gambar (JPG/PNG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran foto maksimal 5 MB.');
      return;
    }

    setPhotoBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarDataUrl(dataUrl);
      setSuccess('Foto siap disimpan. Klik "Simpan Perubahan" untuk menerapkan.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal memproses foto.');
    } finally {
      setPhotoBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
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
          <span>{error}</span>
        </div>
      )}

      {/* Static Info Card (Read-only roles & ID) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Identitas Resmi Personil
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase">NIP (Employee ID)</span>
            <p className="font-mono font-bold text-slate-900 mt-0.5 text-sm">{user.employeeId}</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Peran / Otoritas</span>
            <div className="mt-1">
              <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-blue-100 text-[#123E7A]">
                {user.role}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Departemen</span>
            <p className="font-bold text-slate-800 mt-0.5">{user.department?.name || 'Operations'}</p>
          </div>
        </div>
      </div>

      {/* Profile Photo Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Foto Profil
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-5 mt-4">
          <UserAvatar
            name={user.name}
            avatarUrl={previewAvatarUrl}
            size={96}
            className="ring-4 ring-slate-50 shadow-sm"
          />

          <div className="flex-1 text-center sm:text-left space-y-2">
            <p className="text-xs text-slate-500 leading-relaxed">
              Gunakan foto formal terbaru (JPG/PNG, maks 5 MB). Foto otomatis dipotong persegi
              dan dikompres sebelum disimpan.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleAvatarSelected(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={photoBusy || loading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#123E7A] hover:bg-[#0F2F63] text-white text-xs font-bold transition disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                <span>{photoBusy ? 'Memproses...' : 'Unggah Foto'}</span>
              </button>

              {user.avatarUrl && (
                <button
                  type="button"
                  disabled={photoBusy || loading}
                  onClick={() => setAvatarDataUrl('')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600 text-xs font-bold transition"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Hapus Foto</span>
                </button>
              )}

              {avatarDataUrl !== undefined && (
                <button
                  type="button"
                  onClick={() => setAvatarDataUrl(undefined)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
                >
                  Batalkan perubahan foto
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Editable Fields Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Perbarui Informasi Kontak & Keamanan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123E7A]/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Email Resmi (Terkunci)</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Nomor Telepon / WhatsApp</label>
          <input
            type="text"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+62 812-xxxx-xxxx"
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123E7A]/20 font-mono"
          />
        </div>

        {/* Change Password Section */}
        <div id="keamanan" className="border-t border-slate-100 pt-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Ubah Kata Sandi (Kosongkan jika tidak ingin mengubah)
          </h4>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Kata Sandi Saat Ini</label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123E7A]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Kata Sandi Baru</label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="Minimal 6 karakter"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123E7A]/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Konfirmasi Kata Sandi Baru</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Ulangi kata sandi baru"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123E7A]/20"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#123E7A] hover:bg-[#0F2F63] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
