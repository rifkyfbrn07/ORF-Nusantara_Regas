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
  email: string;
  employeeId: string;
  role: Role;
  position: string;
  departmentId?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
}

/**
 * Encrypts and creates a signed JWT session token
 */
export async function signSession(payload: SessionUser): Promise<string> {
  const key = getAuthSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

/**
 * Verifies JWT token and extracts SessionUser
 */
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const key = getAuthSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Sets the secure session cookie
 */
export async function setSessionCookie(user: SessionUser) {
  const token = await signSession(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Retrieves the current authenticated user session
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Clears the session cookie
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Strictly ensures a user is authenticated
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }

  // Re-hydrate authorization-sensitive claims from PostgreSQL. This prevents a
  // stale session from retaining access after a role change or deactivation.
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true, name: true, email: true, employeeId: true, role: true,
      position: true, departmentId: true, avatarUrl: true, isActive: true,
    },
  });
  if (!user || !user.isActive) throw new Error('UNAUTHORIZED');

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    employeeId: user.employeeId,
    role: user.role,
    position: user.position,
    departmentId: user.departmentId,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
  };
}

/**
 * Strictly ensures the user has one of the allowed roles
 */
export async function requireRole(allowedRoles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

/** Ensures the request originates from an active administrator. */
export async function requireAdmin(): Promise<SessionUser> {
  return requireRole([Role.ADMIN]);
}
