import React from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import {
  Info,
  ShieldAlert,
  Layers,
  Database,
  Users,
  ShieldCheck,
  ClipboardList,
  Clock,
  ArrowLeftRight,
  Server,
  Lock,
  Flame,
  CheckCircle2,
  ExternalLink,
  Code2,
} from 'lucide-react';

export const metadata = {
  title: 'Tentang REGAS FIELDOPS | Sistem & Modul Operasional',
  description: 'Penjelasan platform, modul operasional, arsitektur sistem, dan disclaimer REGAS FIELDOPS',
};

export default async function AdminAboutPage() {
  await requireAdmin();

  const coreModules = [
    {
      title: 'Workforce & Shift Matrix',
      icon: Users,
      color: 'text-[#0066B3] bg-blue-50 border-blue-200',
      description:
        'Pemetaan jadwal kerja shift 24/7 (Pagi, Siang, Malam, Off) dengan kalkulasi otomatis manpower on-duty, cuti, sakit, dan izin secara realtime.',
    },
    {
      title: 'Digital Shift Handover',
      icon: ClipboardList,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      description:
        'Log serah terima tugas antar shift terstruktur mencakup kondisi unit operasional, status peralatan, parameter kritis, dan konfirmasi penerima.',
    },
    {
      title: 'HSSE Compliance & Safety',
      icon: ShieldCheck,
      color: 'text-[#E1251B] bg-red-50 border-red-200',
      description:
        'Pencatatan checklist keselamatan harian, insiden, safe working hours, serta monitoring kepatuhan HSSE di area operasional lapangan.',
    },
    {
      title: 'Attendance & Geolocation',
      icon: Clock,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      description:
        'Pencatatan absensi masuk dan keluar shift terverifikasi waktu server dengan rekapitulasi kehadiran dan status on-duty operator.',
    },
    {
      title: 'Shift Exchange Request',
      icon: ArrowLeftRight,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      description:
        'Workflow pengajuan tukar shift antar operator yang memerlukan persetujuan rekan kerja dan validasi resmi dari Operations Manager.',
    },
    {
      title: 'Role-Based Security & Audit',
      icon: Lock,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
      description:
        'Pemisahan ketat hak akses Admin, Manager, dan Operator dengan session rehydration langsung dari database dan audit trail komprehensif.',
    },
  ];

  const techStack = [
    { name: 'Next.js 16 App Router', role: 'Fullstack Framework (RSC & Server Actions)' },
    { name: 'Neon Serverless PostgreSQL', role: 'Database Tier with SSL Connection Pooling' },
    { name: 'Prisma ORM', role: 'Type-safe Database Schema & Migrations' },
    { name: 'NextAuth.js (Auth.js)', role: 'Encrypted JWT Session Management & RBAC' },
    { name: 'Tailwind CSS', role: 'Modern Industrial UI Design System' },
    { name: 'TypeScript', role: 'Strict End-to-End Type Safety' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin/dashboard" className="hover:text-[#0066B3] transition">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Tentang Platform</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F315A] tracking-tight flex items-center gap-2">
            <Info className="h-6 w-6 text-[#0066B3]" />
            Tentang REGAS FIELDOPS
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Informasi platform, deskripsi modul fungsional, arsitektur teknis, dan ketentuan penggunaan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-[#0066B3] bg-blue-50 border border-blue-200 rounded-xl">
            <Server className="h-3.5 w-3.5" />
            v2.4.0 (Enterprise)
          </span>
        </div>
      </div>

      {/* 1. DISCLAIMER NOTICE (CRITICAL REQUIREMENT) */}
      <div className="bg-amber-50/80 border border-amber-300/80 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                Pemberitahuan Sistem & Prototype Disclaimer
              </h2>
              <span className="text-[10px] font-bold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                Internal Operational Platform
              </span>
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              Platform <strong>REGAS FIELDOPS</strong> dikembangkan sebagai sistem prototype dan dashboard internal manajemen operasi shift tenaga kerja lapangan yang terinspirasi oleh operasional <strong>Pertamina Nusantara Regas</strong>.
            </p>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              Aplikasi ini <strong>BUKAN merupakan aplikasi resmi atau representasi legal dari PT Pertamina (Persero)</strong> maupun entitas afiliasinya. Seluruh data, alur kerja, dan penamaan unit digunakan semata-mata untuk tujuan perancangan dan operasional internal sistem manajemen shift terpadu.
            </p>
          </div>
        </div>
      </div>

      {/* 2. PLATFORM OVERVIEW HERO */}
      <div className="bg-gradient-to-br from-[#0F315A] via-[#0066B3] to-[#0A2540] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 text-xs font-semibold">
            <Flame className="h-3.5 w-3.5 text-amber-300" />
            Operator Workforce & Shift Management Platform
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Pusat Kendali Operasi Lapangan Berkelanjutan & Presisi Tinggi
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            REGAS FIELDOPS menjembatani koordinasi antara jajaran <strong>Operations Manager</strong>, <strong>Shift Supervisors</strong>, dan <strong>Field Operators</strong> dalam menjaga keandalan fasilitas gasifikasi, kelancaran rotasi kerja 24/7, keselamatan kerja HSSE, serta serah terima shift tanpa celah informasi.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-blue-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" /> 24/7 Continuous Monitoring
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Zero Data Loss Handover
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Realtime HSSE Compliance
            </span>
          </div>
        </div>

        {/* Subtle decorative background circles */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-12 bottom-0 translate-y-16 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 3. CORE FUNCTIONAL MODULES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-[#0F315A] flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#0066B3]" />
              Modul Fungsional Utama
            </h2>
            <p className="text-xs text-slate-500">
              Arsitektur modul operasional yang terintegrasi secara modular
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coreModules.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition group flex flex-col justify-between"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3.5 ${mod.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-black text-[#0F315A] group-hover:text-[#0066B3] transition">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {mod.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400">
                  <span>Modul {idx + 1}</span>
                  <span className="text-[#0066B3] font-semibold flex items-center gap-1">
                    Aktif & Terpantau
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. TECHNICAL ARCHITECTURE & ROLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Matrix */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-[#0F315A] flex items-center gap-2">
              <Users className="h-4 w-4 text-[#0066B3]" />
              Matriks Peran & Hak Akses (RBAC)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemisahan tanggung jawab operasional vs administratif sistem
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-purple-900">ADMINISTRATOR (SISTEM)</span>
                <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-purple-950/80 leading-relaxed">
                Mengelola akun personil, reset password, aktivasi/deaktivasi, konfigurasi sistem, dan pemantauan audit trail. Tidak dimasukkan ke dalam metrik headcount shift operasional.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-[#0F315A]">OPERATIONS MANAGER</span>
                <span className="text-[10px] font-mono font-bold bg-blue-100 text-[#0066B3] px-2 py-0.5 rounded">
                  MANAGER
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Supervisi operasional lapangan, monitoring kehadiran shift, approval pengajuan izin/cuti/tukar shift, verifikasi handover, dan evaluasi kepatuhan HSSE.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black text-emerald-900">FIELD OPERATOR</span>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  OPERATOR
                </span>
              </div>
              <p className="text-[11px] text-emerald-950/80 leading-relaxed">
                Pelaksana shift lapangan. Akses jadwal kerja, absensi mandiri, pengajuan tukar shift/cuti, pengisian catatan serah terima (handover), dan pelaporan HSSE.
              </p>
            </div>
          </div>
        </div>

        {/* Tech Stack Matrix */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-[#0F315A] flex items-center gap-2">
              <Database className="h-4 w-4 text-[#0066B3]" />
              Teknologi & Infrastruktur
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Stack modern untuk keandalan dan skalabilitas tinggi
            </p>
          </div>

          <div className="space-y-2.5">
            {techStack.map((tech, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200/60"
              >
                <div className="flex items-center gap-2.5">
                  <Code2 className="h-4 w-4 text-[#0066B3]" />
                  <span className="text-xs font-bold text-slate-800">{tech.name}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium text-right max-w-[200px] truncate">
                  {tech.role}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            Database pooling terintegrasi dengan Neon PostgreSQL Serverless & SSL Enforced.
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[#0F315A]">Butuh dukungan teknis atau penyesuaian konfigurasi?</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Hubungi System Administrator atau buka halaman Pengaturan Sistem untuk melihat status database.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/admin/settings"
            className="flex-1 sm:flex-none text-center px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Pengaturan Sistem
          </Link>
          <Link
            href="/admin/users"
            className="flex-1 sm:flex-none text-center px-4 py-2 text-xs font-bold text-white bg-[#0066B3] hover:bg-[#0F315A] rounded-xl transition"
          >
            Kelola Pengguna
          </Link>
        </div>
      </div>
    </div>
  );
}
