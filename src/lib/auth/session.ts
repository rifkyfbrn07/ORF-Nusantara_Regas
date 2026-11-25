import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

const SESSION_COOKIE_NAME = 'fieldops_session_token';

function getAuthSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET must be configured in environment variables. See .env.example.');
  }
  return new TextEncoder().encode(secret);
}

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  employeeId: string;
  role: Role;
  position: string;
  departmentId?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
}

export async function signSession(payload: SessionUser): Promise<string> {
  const key = getAuthSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const key = getAuthSecretKey();
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    if (
      typeof payload.id !== 'string' ||
      typeof payload.name !== 'string' ||
      typeof payload.username !== 'string' ||
      (typeof payload.email !== 'string' && payload.email !== null) ||
      typeof payload.employeeId !== 'string' ||
      typeof payload.position !== 'string' ||
      typeof payload.isActive !== 'boolean' ||
      (payload.role !== 'ADMIN' && payload.role !== 'MANAGER' && payload.role !== 'LEAD_OPERATOR' && payload.role !== 'OPERATOR')
    ) {
      return null;
    }
    return {
      id: payload.id,
      name: payload.name,
      username: payload.username,
      email: payload.email,
      employeeId: payload.employeeId,
      role: payload.role as Role,
      position: payload.position,
      departmentId: typeof payload.departmentId === 'string' ? payload.departmentId : null,
      avatarUrl: typeof payload.avatarUrl === 'string' ? payload.avatarUrl : null,
      isActive: payload.isActive,
      mustChangePassword: payload.mustChangePassword === true,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser) {
  const token = await signSession(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  const account = await prisma.user.findUnique({ where: { id: session.id }, select: { isActive: true, mustChangePassword: true } });
  if (!account?.isActive) return null;
  return { ...session, mustChangePassword: account.mustChangePassword };
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error('UNAUTHORIZED');

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      employeeId: true,
      role: true,
      position: true,
      departmentId: true,
      avatarUrl: true,
      isActive: true,
      mustChangePassword: true,
    },
  });
  if (!user || !user.isActive) throw new Error('UNAUTHORIZED');
  if (user.mustChangePassword) throw new Error('PASSWORD_CHANGE_REQUIRED');
  return { ...user, mustChangePassword: false };
}

export async function requirePasswordChangeAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: {
    id: true, name: true, username: true, email: true, employeeId: true, role: true,
    position: true, departmentId: true, avatarUrl: true, isActive: true, mustChangePassword: true,
  } });
  if (!user || !user.isActive) throw new Error('UNAUTHORIZED');
  return user;
}

export async function requireRole(allowedRoles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) throw new Error('FORBIDDEN');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole([Role.ADMIN]);
}
