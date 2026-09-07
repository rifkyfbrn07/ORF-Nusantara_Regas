'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';
import { adminPasswordResetSchema, adminUserCreateSchema, adminUserUpdateSchema, type AdminUserCreateInput, type AdminUserUpdateInput } from '@/lib/validation';
import { recordAuditLog } from '@/server/services/auditService';

const userPaths = () => { revalidatePath('/admin/users'); revalidatePath('/admin/dashboard'); };

export async function createAdminUserAction(input: AdminUserCreateInput) {
  try {
    const admin = await requireAdmin();
    const parsed = adminUserCreateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
    const { password, ...data } = parsed.data;
    const user = await prisma.user.create({ data: { name: data.name, email: data.email, employeeId: data.employeeId, role: data.role, position: data.position, isActive: data.isActive, departmentId: data.departmentId || null, phone: data.phone || null, avatarUrl: data.avatarUrl || null, passwordHash: await bcrypt.hash(password, 12) } });
    await recordAuditLog({ userId: admin.id, action: 'ADMIN_CREATE_USER', entity: 'User', entityId: user.id, metadata: { email: user.email, role: user.role } });
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
    const { id, ...data } = parsed.data;
    if (id === admin.id && !data.isActive) return { success: false, error: 'Anda tidak dapat menonaktifkan akun sendiri.' };
    const user = await prisma.user.update({ where: { id }, data: { ...data, departmentId: data.departmentId || null, phone: data.phone || null, avatarUrl: data.avatarUrl || null } });
    await recordAuditLog({ userId: admin.id, action: 'ADMIN_UPDATE_USER', entity: 'User', entityId: user.id, metadata: { email: user.email, role: user.role, isActive: user.isActive } });
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

/** Preserves operational history: account deletion is represented by deactivation. */
export async function deleteAdminUserAction(id: string) {
  const result = await toggleAdminUserStatusAction(id);
  if (result.success && result.user && !result.user.isActive) {
    const admin = await requireAdmin();
    await recordAuditLog({ userId: admin.id, action: 'ADMIN_DELETE_USER', entity: 'User', entityId: id, metadata: { mode: 'soft-delete' } });
  }
  return result;
}
