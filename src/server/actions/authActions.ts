'use server';

import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { setSessionCookie, clearSessionCookie, getSession } from '@/lib/auth/session';
import { loginSchema, LoginInput } from '@/lib/validation';
import { recordAuditLog } from '../services/auditService';
import { revalidatePath } from 'next/cache';

export async function loginAction(formData: LoginInput) {
  const parse = loginSchema.safeParse(formData);
  if (!parse.success) {
    return { success: false, error: parse.error.issues[0]?.message || 'Input tidak valid' };
  }

  const { email, password } = parse.data;

  // Query user from PostgreSQL
  const user = await prisma.user.findUnique({
    where: { email },
    include: { department: true },
  });

  if (!user || !user.isActive) {
    return { success: false, error: 'Email atau kata sandi salah, atau akun nonaktif.' };
  }

  // Verify bcrypt password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return { success: false, error: 'Email atau kata sandi salah.' };
  }

  // Create session
  await setSessionCookie({
    id: user.id,
    name: user.name,
    email: user.email,
    employeeId: user.employeeId,
    role: user.role,
    position: user.position,
    departmentId: user.departmentId,
    avatarUrl: user.avatarUrl,
  });

  // Record audit log
  await recordAuditLog({
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    metadata: { role: user.role, email: user.email },
  });

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
    redirectTo: user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'MANAGER' ? '/manager/dashboard' : '/operator/dashboard',
  };
}

export async function logoutAction() {
  const user = await getSession();
  if (user) {
    await recordAuditLog({
      userId: user.id,
      action: 'LOGOUT',
      entity: 'User',
      entityId: user.id,
    });
  }

  await clearSessionCookie();
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function getCurrentUserAction() {
  return getSession();
}
