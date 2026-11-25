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
import { assertNoPendingLeaveRequestsForRoutingChange } from '@/server/services/leaveService';
import { getUserDeletionBlockers } from '@/server/services/userDeletionService';

const userPaths = () => {
  revalidatePath('/admin/users');
  revalidatePath('/admin/dashboard');
  revalidatePath('/profile');
  revalidatePath('/operator/requests');
  revalidatePath('/manager/requests');
  revalidatePath('/manager/operators');
  revalidatePath('/manager/jadwal-operator');
  revalidatePath('/operator/roster');
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

    const standardPassword = await prisma.systemSetting.findUnique({ where: { key: 'initialPasswordHash' }, select: { value: true } });
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
        team: data.team?.trim().toUpperCase() || null,
        phone: data.phone?.trim() || null,
        avatarUrl: data.avatarUrl || null,
        passwordHash: standardPassword?.value || await bcrypt.hash(password, 12),
        mustChangePassword: true,
      },
    });

    await recordAuditLog({
      userId: admin.id,
      action: 'ADMIN_CREATE_USER',
      entity: 'User',
      entityId: user.id,
      metadata: { username: user.username, role: user.role, email: user.email, team: user.team },
    });
    userPaths();
    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role,
        position: user.position,
        isActive: user.isActive,
        departmentId: user.departmentId,
      },
    };
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
      select: { name: true, role: true, username: true, team: true },
    });
    if (!existing) return { success: false, error: 'Akun tidak ditemukan.' };

    if (data.role === 'ADMIN' && existing.role !== 'ADMIN') {
      return { success: false, error: 'Sistem hanya memiliki 1 ADMIN utama. Role tidak dapat diubah menjadi ADMIN.' };
    }
    if (existing.role === 'ADMIN' && data.role && data.role !== 'ADMIN') {
      return { success: false, error: 'ADMIN utama tidak dapat diubah role-nya.' };
    }
    await assertNoPendingLeaveRequestsForRoutingChange(
      id,
      data.team === undefined ? existing.team : data.team.trim().toUpperCase() || null,
      data.role || existing.role
    );

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
        ...(data.team !== undefined ? { team: data.team.trim().toUpperCase() || null } : {}),
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
      metadata: { username: user.username, role: user.role, isActive: user.isActive, team: user.team },
    });
    userPaths();
    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role,
        position: user.position,
        isActive: user.isActive,
        departmentId: user.departmentId,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('Tim atau role akun tidak dapat diubah')) {
      return { success: false, error: message };
    }
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

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: !current.isActive },
      select: { id: true, name: true, username: true, isActive: true },
    });
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
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, name: true, username: true },
      });
      if (!target) throw new Error('Akun tidak ditemukan.');
      await tx.user.update({
        where: { id: target.id },
        data: { passwordHash, mustChangePassword: true },
      });
      const auditLog = await recordAuditLog({
        userId: admin.id,
        action: 'ADMIN_RESET_PASSWORD',
        entity: 'User',
        entityId: target.id,
        metadata: { username: target.username, name: target.name },
      }, tx);
      if (!auditLog) throw new Error('Gagal mencatat audit perubahan kata sandi.');
      return target;
    });
    userPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error && error.message === 'Akun tidak ditemukan.'
        ? error.message
        : 'Gagal mereset kata sandi.',
    };
  }
}

export async function setStandardInitialPasswordAction(input: { password: string; confirmPassword: string }) {
  try {
    const admin = await requireAdmin();
    if (input.password.length < 8) return { success: false, error: 'Kata sandi standar minimal 8 karakter.' };
    if (input.password !== input.confirmPassword) return { success: false, error: 'Konfirmasi kata sandi tidak sama.' };
    const passwordHash = await bcrypt.hash(input.password, 12);
    const affected = await prisma.$transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { key: 'initialPasswordHash' },
        create: { key: 'initialPasswordHash', value: passwordHash },
        update: { value: passwordHash },
      });
      const result = await tx.user.updateMany({ data: { passwordHash, mustChangePassword: true } });
      const audit = await recordAuditLog({
        userId: admin.id,
        action: 'ADMIN_SET_STANDARD_INITIAL_PASSWORD',
        entity: 'User',
        metadata: { affectedAccounts: result.count },
      }, tx);
      if (!audit) throw new Error('Audit gagal.');
      return result.count;
    });
    userPaths();
    return { success: true, affected };
  } catch (error) {
    return { success: false, error: error instanceof Error && error.message === 'Audit gagal.' ? error.message : 'Gagal menerapkan password awal standar.' };
  }
}

export async function deleteAdminUserAction(id: string) {
  try {
    const admin = await requireAdmin();
    if (id === admin.id) return { success: false, error: 'Anda tidak dapat menghapus akun sendiri.' };
    const result = await prisma.$transaction(async (tx) => {
      // Prevent concurrent inserts from attaching new history while the preflight runs.
      await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`;
      const target = await tx.user.findUnique({
        where: { id },
        select: { id: true, isActive: true, email: true, username: true, name: true, role: true, employeeId: true },
      });
      if (!target) return { success: false as const, error: 'Akun tidak ditemukan.' };
      if (target.role === 'ADMIN') return { success: false as const, error: 'ADMIN utama tidak boleh dihapus.' };

      const scheduleIds = await tx.schedule.findMany({ where: { userId: id }, select: { id: true } });
      const blockers = await getUserDeletionBlockers(id, tx);
      if (blockers.length > 0) {
        return {
          success: false as const,
          error: 'Akun belum dapat dihapus karena masih terhubung dengan data operasional yang belum memiliki mekanisme arsip aman.',
        };
      }

      await tx.user.delete({ where: { id: target.id } });
      const preservedScheduleCount = scheduleIds.length
        ? await tx.schedule.count({
            where: {
              id: { in: scheduleIds.map(({ id: scheduleId }) => scheduleId) },
              userId: null,
              operatorNameSnapshot: target.name,
              operatorEmployeeIdSnapshot: target.employeeId,
            },
          })
        : 0;
      if (preservedScheduleCount !== scheduleIds.length) {
        throw new Error(`Penghapusan dibatalkan: arsip jadwal tidak lengkap (${preservedScheduleCount}/${scheduleIds.length}).`);
      }
      const auditLog = await recordAuditLog({
        userId: admin.id,
        action: 'ADMIN_DELETE_USER',
        entity: 'User',
        entityId: target.id,
        metadata: {
          mode: 'hard-delete', username: target.username, email: target.email, name: target.name,
          wasActive: target.isActive, archivedScheduleCount: preservedScheduleCount,
        },
      }, tx);
      if (!auditLog) throw new Error('Gagal mencatat audit penghapusan akun.');
      return { success: true as const, user: { id: target.id, username: target.username, name: target.name } };
    }, { maxWait: 10000, timeout: 30000 });
    if (!result.success) return result;
    userPaths();
    return result;
  } catch (error) {
    console.error('Failed to delete admin user:', error);
    if (error instanceof Error && error.message.startsWith('Penghapusan dibatalkan:')) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Gagal menghapus akun. Tidak ada perubahan yang disimpan.' };
  }
}
