'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';
import { adminPasswordResetSchema, adminUserCreateSchema, adminUserUpdateSchema, usernameSchema, type AdminUserCreateInput, type AdminUserUpdateInput } from '@/lib/validation';
import { recordAuditLog } from '@/server/services/auditService';
import { slugifyUsername } from '@/lib/auth/username';

const userPaths = () => { revalidatePath('/admin/users'); revalidatePath('/admin/dashboard'); };

/** Reservasi username unik: slug dari nama bila kosong, sufiks angka bila bentrok. */
async function resolveUniqueUsername(prismaDb: typeof prisma, desired: string | null | undefined, name: string, excludeUserId?: string): Promise<string> {
  let base = (desired || '').trim().toLowerCase();
  if (!base) base = slugifyUsername(name);
  let candidate = base;
  let suffix = 2;
  // Loop terbatas untuk keamanan
  for (let i = 0; i < 50; i++) {
    const exists = await prismaDb.user.findFirst({
      where: { username: candidate, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
      select: { id: true },
    });
    if (!exists) return candidate;
    candidate = `${base}${suffix++}`;
  }
  return `${base}${Date.now()}`;
}

export async function createAdminUserAction(input: AdminUserCreateInput) {
  try {
    const admin = await requireAdmin();
    const parsed = adminUserCreateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    const { password, username, ...data } = parsed.data;
    const finalUsername = await resolveUniqueUsername(prisma, username, data.name);
    const user = await prisma.user.create({ data: { name: data.name, email: data.email, employeeId: data.employeeId, username: finalUsername, role: data.role, position: data.position, isActive: data.isActive, departmentId: data.departmentId || null, phone: data.phone || null, avatarUrl: data.avatarUrl || null, passwordHash: await bcrypt.hash(password, 12) } });
    await recordAuditLog({ userId: admin.id, action: 'ADMIN_CREATE_USER', entity: 'User', entityId: user.id, metadata: { email: user.email, username: user.username, role: user.role } });
    userPaths();
    return { success: true, user };
  } catch (error: unknown) {
    const message = error instanceof Error && error.message.includes('Unique constraint') ? 'Email atau Employee ID sudah digunakan.' : 'Gagal membuat akun.';
    return { success: false, error: message };
  }
}

export async function updateAdminUserAction(input: AdminUserUpdateInput) {
  try {
    const admin = await requireAdmin();
    const parsed = adminUserUpdateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    const { id, username, ...data } = parsed.data;
    if (id === admin.id && !data.isActive) return { success: false, error: 'Anda tidak dapat menonaktifkan akun sendiri.' };
    if (id === admin.id && data.role && data.role !== 'ADMIN') {
      return { success: false, error: 'Anda tidak dapat menurunkan role akun sendiri.' };
    }
    const existing = await prisma.user.findUnique({ where: { id }, select: { name: true } });
    if (!existing) return { success: false, error: 'Akun tidak ditemukan.' };
    let finalUsername: string | undefined;
    if (username !== undefined) {
      const usernameCheck = usernameSchema.safeParse(username);
      if (!usernameCheck.success) return { success: false, error: usernameCheck.error.issues[0]?.message };
      finalUsername = await resolveUniqueUsername(prisma, usernameCheck.data, data.name || existing.name, id);
    }
    const user = await prisma.user.update({ where: { id }, data: { ...data, ...(finalUsername ? { username: finalUsername } : {}), departmentId: data.departmentId || null, phone: data.phone || null, avatarUrl: data.avatarUrl || null } });
    await recordAuditLog({ userId: admin.id, action: 'ADMIN_UPDATE_USER', entity: 'User', entityId: user.id, metadata: { email: user.email, username: user.username, role: user.role, isActive: user.isActive } });
    userPaths();
    return { success: true, user };
  } catch { return { success: false, error: 'Gagal memperbarui akun. Pastikan email dan Employee ID unik.' }; }
}

export async function toggleAdminUserStatusAction(id: string) {
  try {
    const admin = await requireAdmin();
    if (id === admin.id) return { success: false, error: 'Anda tidak dapat menonaktifkan akun sendiri.' };
    const current = await prisma.user.findUnique({ where: { id }, select: { isActive: true, email: true } });
    if (!current) return { success: false, error: 'Akun tidak ditemukan.' };
    const user = await prisma.user.update({ where: { id }, data: { isActive: !current.isActive } });
    await recordAuditLog({ userId: admin.id, action: user.isActive ? 'ADMIN_ENABLE_USER' : 'ADMIN_DISABLE_USER', entity: 'User', entityId: id, metadata: { email: current.email } });
    userPaths();
    return { success: true, user };
  } catch { return { success: false, error: 'Gagal mengubah status akun.' }; }
}

export async function resetAdminUserPasswordAction(input: { id: string; password: string }) {
  try {
    const admin = await requireAdmin();
    const parsed = adminPasswordResetSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    await prisma.user.update({ where: { id: parsed.data.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
    await recordAuditLog({ userId: admin.id, action: 'ADMIN_RESET_PASSWORD', entity: 'User', entityId: parsed.data.id });
    return { success: true };
  } catch { return { success: false, error: 'Gagal mereset kata sandi.' }; }
}

/**
 * FIX "Hapus Akun": sebelumnya memakai toggle status sehingga menghapus akun
 * yang sudah nonaktif JUSTRU MENGAKTIFKANNYA kembali. Sekarang soft-delete
 * deterministik (isActive = false) — histori attendance/schedule/leave
 * dipertahankan (schema memakai onDelete: SetNull/Cascade yang aman).
 * Admin tidak dapat menghapus akun dirinya sendiri.
 */
export async function deleteAdminUserAction(id: string) {
  try {
    const admin = await requireAdmin();
    if (id === admin.id) {
      return { success: false, error: 'Anda tidak dapat menghapus akun sendiri.' };
    }
    const target = await prisma.user.findUnique({ where: { id }, select: { isActive: true, email: true, name: true } });
    if (!target) return { success: false, error: 'Akun tidak ditemukan.' };
    if (!target.isActive) {
      return { success: true, user: { isActive: false }, alreadyInactive: true };
    }
    const user = await prisma.user.update({ where: { id }, data: { isActive: false } });
    await recordAuditLog({ userId: admin.id, action: 'ADMIN_DELETE_USER', entity: 'User', entityId: id, metadata: { mode: 'soft-delete', email: target.email, name: target.name } });
    userPaths();
    return { success: true, user };
  } catch {
    return { success: false, error: 'Gagal menghapus akun.' };
  }
}
