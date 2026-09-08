import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import type { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * Global Search API — dipakai Topbar.
 * Otorisasi: session wajib; hasil user & program kerja hanya untuk
 * MANAGER/ADMIN (operator tidak boleh melihat data user lain).
 */
interface MenuEntry {
  label: string;
  href: string;
  role: Role | 'ALL';
  keywords: string;
}

const MENUS: MenuEntry[] = [
  { label: 'Dashboard Admin', href: '/admin/dashboard', role: 'ADMIN', keywords: 'admin dashboard home beranda' },
  { label: 'Kelola Pengguna', href: '/admin/users', role: 'ADMIN', keywords: 'user pengguna akun kelola admin' },
  { label: 'Tambah Pengguna', href: '/admin/users/create', role: 'ADMIN', keywords: 'tambah create user pengguna baru' },
  { label: 'Pengaturan Sistem', href: '/admin/settings', role: 'ADMIN', keywords: 'setting pengaturan sistem database' },
  { label: 'Tentang Sistem', href: '/admin/about', role: 'ADMIN', keywords: 'tentang about sistem' },
  { label: 'Dashboard Manager', href: '/manager/dashboard', role: 'MANAGER', keywords: 'manager dashboard home beranda monitoring' },
  { label: 'Jadwal Kerja', href: '/manager/schedules', role: 'MANAGER', keywords: 'jadwal schedule shift kerja bulk import excel' },
  { label: 'Jadwal Operator', href: '/manager/jadwal-operator', role: 'MANAGER', keywords: 'jadwal operator roster orf kalender' },
  { label: 'Program Kerja', href: '/manager/program-kerja', role: 'MANAGER', keywords: 'program kerja target plan realisasi tahunan' },
  { label: 'Monitoring Manpower', href: '/manager/workforce', role: 'MANAGER', keywords: 'manpower monitoring tenaga kerja' },
  { label: 'Operator Roster', href: '/manager/operators', role: 'MANAGER', keywords: 'operator roster daftar personil' },
  { label: 'Absensi', href: '/manager/attendance', role: 'MANAGER', keywords: 'absensi attendance presensi' },
  { label: 'Cuti & Izin', href: '/manager/requests', role: 'MANAGER', keywords: 'cuti izin leave request persetujuan' },
  { label: 'Handover', href: '/manager/handover', role: 'MANAGER', keywords: 'handover serah terima shift' },
  { label: 'HSSE', href: '/manager/hsse', role: 'MANAGER', keywords: 'hsse safety checklist keselamatan' },
  { label: 'Pengumuman', href: '/manager/announcements', role: 'MANAGER', keywords: 'pengumuman announcement broadcast' },
];

const MENUS_PART2: MenuEntry[] = [
  { label: 'Notifikasi', href: '/notifications', role: 'ALL', keywords: 'notifikasi notification pesan pemberitahuan' },
  { label: 'Laporan', href: '/manager/reports', role: 'MANAGER', keywords: 'laporan report export' },
  { label: 'Audit Log', href: '/manager/audit-logs', role: 'MANAGER', keywords: 'audit log jejak aktivitas' },
  { label: 'Dashboard Operator', href: '/operator/dashboard', role: 'OPERATOR', keywords: 'operator dashboard home beranda' },
  { label: 'Jadwal Saya', href: '/operator/schedule', role: 'OPERATOR', keywords: 'jadwal saya schedule shift' },
  { label: 'Roster Bulanan', href: '/operator/jadwal-saya', role: 'OPERATOR', keywords: 'roster bulanan jadwal kalender' },
  { label: 'Absensi Saya', href: '/operator/attendance', role: 'OPERATOR', keywords: 'absensi attendance presensi saya' },
  { label: 'Pergantian Shift', href: '/operator/shift-exchange', role: 'OPERATOR', keywords: 'pergantian shift tukar exchange' },
  { label: 'Cuti & Izin', href: '/operator/requests', role: 'OPERATOR', keywords: 'cuti izin leave request' },
  { label: 'Profil Akun', href: '/profile', role: 'ALL', keywords: 'profil profile akun foto password' },
];

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results: Array<{ type: string; title: string; subtitle: string; href: string }> = [];

  // 1. Menu (semua role, hanya menu yang relevan untuk role-nya)
  const menuHit = (m: MenuEntry) =>
    m.label.toLowerCase().includes(q) || m.keywords.includes(q) || m.href.toLowerCase().includes(q);
  const menus = [...MENUS, ...MENUS_PART2].filter(
    (m) => (m.role === 'ALL' || m.role === session.role) && menuHit(m)
  );
  for (const menu of menus.slice(0, 6)) {
    results.push({ type: 'MENU', title: menu.label, subtitle: menu.href, href: menu.href });
  }

  // 2. User & Program Kerja (khusus MANAGER/ADMIN)
  if (session.role === 'ADMIN' || session.role === 'MANAGER') {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
          { employeeId: { contains: q, mode: 'insensitive' } },
          { position: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, username: true, employeeId: true, role: true, position: true, isActive: true },
      take: 5,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    for (const u of users) {
      results.push({
        type: 'USER',
        title: u.name,
        subtitle: `@${u.username || '-'} · ${u.employeeId} · ${u.position}${u.isActive ? '' : ' · Nonaktif'}`,
        href: session.role === 'ADMIN' ? '/admin/users' : `/manager/operators/${u.id}`,
      });
    }

    const programs = await prisma.programKerja.findMany({
      where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { notes: { contains: q, mode: 'insensitive' } }] },
      select: { id: true, name: true, year: true, category: true, status: true },
      take: 4,
      orderBy: [{ year: 'desc' }, { sequence: 'asc' }],
    });
    for (const p of programs) {
      results.push({
        type: 'PROGRAM',
        title: p.name,
        subtitle: `Program Kerja ${p.year} · ${p.category.replaceAll('_', ' ')} · ${p.status.replaceAll('_', ' ')}`,
        href: '/manager/program-kerja',
      });
    }
  }

  return NextResponse.json({ results: results.slice(0, 12) });
}

