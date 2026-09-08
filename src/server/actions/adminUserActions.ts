'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/session';
import {
  adminPasswordResetSchema,
  adminUserCreateSchema,
  adminUserUpdateSchema,
  usernameSchema,
  type AdminUserCreateInput,
  type AdminUserUpdateInput,
} from '@/lib/validation';
import { recordAuditLog } from '@/server/services/auditService';

const userPaths = () => {
  revalidatePath('/admin/users');
  revalidatePath('/admin/dashboard');
  revalidatePath('/profile');
};

async function usernameIsTaken(username: string, excludeUserId?: string): Promise<boolean> {
  const existing = await prisma.user.findFirst({
    where: {
      username: username.toLowerCase(),
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function createAdminUserAction(input: AdminUserCreateInput) {
  try {
    const admin = await requireAdmin();
    const parsed = adminUserCreateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Input tidak valid.' };

    const { password, confirmPassword, ...data } = parsed.data;
    if (password !== confirmPassword) {
      return { success: false, error: 'Konfirmasi kata sandi tidak sama.' };
    }

    const username = data.username.trim().toLowerCase();
    if (await usernameIsTaken(username)) {
      return { success: false, error: `Username @${username} sudah digunakan. Pilih username lain.` };
    }

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        username,
        email: data.email?.trim() || null,
        employeeId: data.employeeId.trim(),
        role: data.role,
        position: data.position.trim(),
        isActive: data.isActive,
        departmentId: data.departmentId || null,
        phone: data.phone?.trim() || null,
        avatarUrl: data.avatarUrl || null,
        passwordHash: await bcrypt.hash(password, 12),
      },
    });

    await recordAuditLog({
      userId: admin.id,
      action: 'ADMIN_CREATE_USER',
      entity: 'User',
      entityId: user.id,
      metadata: { username: user.username, role: user.role, email: user.email },
    });
    userPaths();
    return { success: true, user };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Unique constraint')) {
      return { success: false, error: 'Username, email, atau Employee ID sudah digunakan.' };
    }
    return { success: false, error: 'Gagal membuat akun.' };
  }
}

export async function updateAdminUserAction(input: AdminUserUpdateInput) {
  try {
    const admin = await requireAdmin();
    const parsed = adminUserUpdateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Input tidak valid.' };

    const { id, username, ...data } = parsed.data;
    if (id === admin.id && !data.isActive) return { success: false, error: 'Anda tidak dapat menonaktifkan akun sendiri.' };
    if (id === admin.id && data.role && data.role !== 'ADMIN') {
      return { success: false, error: 'Anda tidak dapat menurunkan role akun sendiri.' };
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { name: true, role: true, username: true },
    });
    if (!existing) return { success: false, error: 'Akun tidak ditemukan.' };

    if (data.role === 'ADMIN' && existing.role !== 'ADMIN') {
      return { success: false, error: 'Sistem hanya memiliki 1 ADMIN utama. Role tidak dapat diubah menjadi ADMIN.' };
    }
    if (existing.role === 'ADMIN' && data.role && data.role !== 'ADMIN') {
      return { success: false, error: 'ADMIN utama tidak dapat diubah role-nya.' };
    }

    const normalizedUsername = username.trim().toLowerCase();
    if (await usernameIsTaken(normalizedUsername, id)) {
      return { success: false, error: `Username @${normalizedUsername} sudah digunakan.` };
    }

    const usernameValidation = usernameSchema.safeParse(normalizedUsername);
    if (!usernameValidation.success) {
      return { success: false, error: usernameValidation.error.issues[0]?.message || 'Username tidak valid.' };
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        username: normalizedUsername,
        email: data.email?.trim() || null,
        departmentId: data.departmentId || null,
        phone: data.phone?.trim() || null,
        avatarUrl: data.avatarUrl || null,
      },
    });

    await recordAuditLog({
      userId: admin.id,
      action: 'ADMIN_UPDATE_USER',
      entity: 'User',
      entityId: user.id,
      metadata: { username: user.username, role: user.role, isActive: user.isActive },
    });
    userPaths();
    return { success: true, user };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Unique constraint')) {
      return { success: false, error: 'Username, email, atau Employee ID sudah digunakan.' };
    }
    return { success: false, error: 'Gagal memperbarui akun.' };
  }
}

export async function toggleAdminUserStatusAction(id: string) {
  try {
    const admin = await requireAdmin();
    if (id === admin.id) return { success: false, error: 'Anda tidak dapat menonaktifkan akun sendiri.' };
    const current = await prisma.user.findUnique({ where: { id }, select: { isActive: true, email: true, username: true } });
    if (!current) return { success: false, error: 'Akun tidak ditemukan.' };

    const user = await prisma.user.update({ where: { id }, data: { isActive: !current.isActive } });
    await recordAuditLog({
      userId: admin.id,
      action: user.isActive ? 'ADMIN_ENABLE_USER' : 'ADMIN_DISABLE_USER',
      entity: 'User',
      entityId: id,
      metadata: { username: current.username, email: current.email },
    });
    userPaths();
    return { success: true, user };
  } catch {
    return { success: false, error: 'Gagal mengubah status akun.' };
  }
}

export async function resetAdminUserPasswordAction(input: { id: string; password: string }) {
  try {
    const admin = await requireAdmin();
    const parsed = adminPasswordResetSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Input tidak valid.' };
    await prisma.user.update({
      where: { id: parsed.data.id },
      data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) },
    });
    await recordAuditLog({ userId: admin.id, action: 'ADMIN_RESET_PASSWORD', entity: 'User', entityId: parsed.data.id });
    return { success: true };
  } catch {
    return { success: false, error: 'Gagal mereset kata sandi.' };
  }
}

export async function deleteAdminUserAction(id: string) {
  try {
    const admin = await requireAdmin();
    if (id === admin.id) return { success: false, error: 'Anda tidak dapat menghapus akun sendiri.' };

    const target = await prisma.user.findUnique({
      where: { id },
      select: { isActive: true, email: true, username: true, name: true, role: true },
    });
    if (!target) return { success: false, error: 'Akun tidak ditemukan.' };
    if (target.role === 'ADMIN') return { success: false, error: 'ADMIN utama tidak boleh dihapus.' };
    if (!target.isActive) return { success: true, user: { isActive: false }, alreadyInactive: true };

    const user = await prisma.user.update({ where: { id }, data: { isActive: false } });
    await recordAuditLog({
      userId: admin.id,
      action: 'ADMIN_DELETE_USER',
      entity: 'User',
      entityId: id,
      metadata: { mode: 'soft-delete', username: target.username, email: target.email, name: target.name },
    });
    userPaths();
    return { success: true, user };
  } catch {
    return { success: false, error: 'Gagal menghapus akun.' };
  }
}
