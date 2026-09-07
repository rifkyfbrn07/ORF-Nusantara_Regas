'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  UserPlus,
  ArrowLeft,
  Shield,
  UserCog,
  HardHat,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Hash,
  Phone,
  Briefcase,
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { createAdminUserAction } from '@/server/actions/adminUserActions';

type Department = {
  id: string;
  name: string;
};

interface CreateUserFormProps {
  departments: Department[];
}

export default function CreateUserForm({ departments }: CreateUserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    password: '',
    confirmPassword: '',
    role: 'OPERATOR' as 'ADMIN' | 'MANAGER' | 'OPERATOR',
    position: '',
    departmentId: departments[0]?.id || '',
    phone: '',
    isActive: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const roleConfigs = [
    {
      role: 'OPERATOR' as const,
      label: 'Operator Lapangan',
      icon: HardHat,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Akses mobile/desktop untuk Shift, Jadwal, Absensi, Cuti, Handover, dan HSSE form.',
    },
    {
      role: 'MANAGER' as const,
      label: 'Operations Manager',
      icon: UserCog,
      badgeColor: 'bg-blue-50 text-[#0066B3] border-blue-200',
      description: 'Akses monitoring operasional, approval izin & cuti, plotting jadwal, dan audit HSSE.',
    },
    {
      role: 'ADMIN' as const,
      label: 'System Administrator',
      icon: Shield,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      description: 'Akses penuh kontrol sistem, manajemen akun & kredensial, pengaturan platform & audit trail.',
    },
  ];

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim() || formData.name.trim().length < 3) {
      errors.name = 'Nama lengkap minimal 3 karakter';
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Format email perusahaan tidak valid';
    }
    if (!formData.employeeId.trim() || formData.employeeId.trim().length < 3) {
      errors.employeeId = 'Employee ID (NIP) minimal 3 karakter';
    }
    if (!formData.position.trim() || formData.position.trim().length < 2) {
      errors.position = 'Posisi / jabatan minimal 2 karakter';
    }
    if (!formData.password || formData.password.length < 8) {
      errors.password = 'Kata sandi minimal 8 karakter';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Konfirmasi kata sandi tidak cocok';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Harap periksa kembali isian form Anda.');
      return;
    }

    startTransition(async () => {
      try {
        const result = await createAdminUserAction({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          employeeId: formData.employeeId.trim().toUpperCase(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          role: formData.role,
          position: formData.position.trim(),
          departmentId: formData.departmentId || undefined,
          phone: formData.phone.trim() || undefined,
          isActive: formData.isActive,
        });

        if (result.success) {
          toast.success(`Akun ${formData.name} (${formData.role}) berhasil didaftarkan.`);
          router.push('/admin/users');
          router.refresh();
        } else {
          toast.error(result.error || 'Gagal mendaftarkan akun.');
        }
      } catch {
        toast.error('Terjadi kesalahan jaringan saat membuat akun.');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin/dashboard" className="hover:text-[#0066B3] transition">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/admin/users" className="hover:text-[#0066B3] transition">
              Kelola Pengguna
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Tambah Akun Baru</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F315A] tracking-tight flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-[#0066B3]" />
            Registrasi Akun Pengguna
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftarkan personil baru ke dalam platform kontrol operasi REGAS FIELDOPS
          </p>
        </div>

        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. ROLE SELECTION CARDS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
          <div className="mb-4">
            <label className="text-sm font-black text-[#0F315A] block">
              1. Tentukan Hak Akses & Peran (Role) *
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih tingkat otorisasi yang sesuai dengan tanggung jawab operasional personil
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {roleConfigs.map((cfg) => {
              const Icon = cfg.icon;
              const isSelected = formData.role === cfg.role;
              return (
                <button
                  key={cfg.role}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: cfg.role })}
                  className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-[#0066B3] bg-blue-50/40 ring-2 ring-[#0066B3]/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-[#F8FAFC]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-[#0066B3] text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[11px] font-black text-[#0066B3] bg-white px-2 py-0.5 rounded-full border border-blue-200">
                          <CheckCircle2 className="h-3 w-3" /> Dipilih
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">Pilih</span>
                      )}
                    </div>
                    <p className="text-xs font-black text-[#0F315A]">{cfg.label}</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{cfg.description}</p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-500">ROLE ID</span>
                    <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded ${cfg.badgeColor}`}>
                      {cfg.role}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. PERSONAL & EMPLOYMENT INFO */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-[#0F315A]">
              2. Informasi Identitas & Penugasan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Lengkapi data profil kepegawaian personil
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="text-xs font-bold text-[#0F315A] flex items-center gap-1.5 mb-1.5">
                <User className="h-3.5 w-3.5 text-[#0066B3]" />
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Budi Santoso, S.T."
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
                className={`w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 transition ${
                  formErrors.name ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                }`}
              />
              {formErrors.name && (
                <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.name}
                </p>
              )}
            </div>

            {/* Employee ID */}
            <div>
              <label className="text-xs font-bold text-[#0F315A] flex items-center gap-1.5 mb-1.5">
                <Hash className="h-3.5 w-3.5 text-[#0066B3]" />
                Employee ID / NIP *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: OP-049 atau MGR-002"
                value={formData.employeeId}
                onChange={(e) => {
                  setFormData({ ...formData, employeeId: e.target.value.toUpperCase() });
                  if (formErrors.employeeId) setFormErrors({ ...formErrors, employeeId: '' });
                }}
                className={`w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border rounded-xl font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 transition ${
                  formErrors.employeeId ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                }`}
              />
              {formErrors.employeeId && (
                <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.employeeId}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-bold text-[#0F315A] flex items-center gap-1.5 mb-1.5">
                <Mail className="h-3.5 w-3.5 text-[#0066B3]" />
                Email Perusahaan *
              </label>
              <input
                type="email"
                required
                placeholder="nama@fieldops.local"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value.toLowerCase() });
                  if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                }}
                className={`w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 transition ${
                  formErrors.email ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                }`}
              />
              {formErrors.email && (
                <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-bold text-[#0F315A] flex items-center gap-1.5 mb-1.5">
                <Phone className="h-3.5 w-3.5 text-[#0066B3]" />
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="tel"
                placeholder="0812-xxxx-xxxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 transition"
              />
            </div>

            {/* Position */}
            <div>
              <label className="text-xs font-bold text-[#0F315A] flex items-center gap-1.5 mb-1.5">
                <Briefcase className="h-3.5 w-3.5 text-[#0066B3]" />
                Posisi / Jabatan *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Control Room Operator, HSE Officer"
                value={formData.position}
                onChange={(e) => {
                  setFormData({ ...formData, position: e.target.value });
                  if (formErrors.position) setFormErrors({ ...formErrors, position: '' });
                }}
                className={`w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 transition ${
                  formErrors.position ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                }`}
              />
              {formErrors.position && (
                <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.position}
                </p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="text-xs font-bold text-[#0F315A] flex items-center gap-1.5 mb-1.5">
                <Building2 className="h-3.5 w-3.5 text-[#0066B3]" />
                Departemen / Unit Kerja
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 transition cursor-pointer"
              >
                <option value="">-- Tanpa Departemen Khusus --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account Status Toggle */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#0F315A] block">Status Akun Awal</span>
              <p className="text-[11px] text-slate-500">
                Akun aktif dapat langsung masuk dan menggunakan aplikasi sesuai hak aksesnya
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              <span className="ml-2.5 text-xs font-bold text-slate-700">
                {formData.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </label>
          </div>
        </div>

        {/* 3. SECURITY & CREDENTIALS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-[#0F315A] flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#0066B3]" />
              3. Kredensial & Keamanan Masuk
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tentukan kata sandi awal untuk pengguna baru (minimal 8 karakter)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="text-xs font-bold text-[#0F315A] block mb-1.5">
                Kata Sandi Awal *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimal 8 karakter"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
                  }}
                  className={`w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#F8FAFC] border rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 transition ${
                    formErrors.password ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-bold text-[#0F315A] block mb-1.5">
                Konfirmasi Kata Sandi *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Ulangi kata sandi"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    if (formErrors.confirmPassword) setFormErrors({ ...formErrors, confirmPassword: '' });
                  }}
                  className={`w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#F8FAFC] border rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3]/20 transition ${
                    formErrors.confirmPassword ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {formErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SUBMIT ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-slate-500 text-center sm:text-left">
            Pastikan seluruh data personil dan perannya telah sesuai dengan SOP operational.
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/admin/users"
              className="flex-1 sm:flex-none text-center px-5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#0066B3] hover:bg-[#0F315A] rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mendaftarkan Akun...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Daftarkan Pengguna
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
