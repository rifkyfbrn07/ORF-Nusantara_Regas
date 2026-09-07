import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Route-level authorization gate (Next.js 16 `proxy` convention).
 * - Unauthenticated users are redirected to /login.
 * - OPERATOR users are hard-redirected away from /manager/** (DENIED).
 * - MANAGER users are redirected away from /operator/** areas.
 * - Authenticated users are bounced from /login to their workspace.
 *
 * This is defense-in-depth: every page/action STILL re-verifies the role
 * server-side via requireRole() with claims re-hydrated from PostgreSQL.
 */
const SESSION_COOKIE_NAME = 'fieldops_session_token';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authSecret = process.env.AUTH_SECRET;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let role: string | null = null;
  if (token && authSecret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(authSecret), {
        algorithms: ['HS256'],
      });
      role = typeof payload.role === 'string' ? payload.role : null;
    } catch {
      role = null; // invalid/expired token treated as unauthenticated
    }
  }

  const isManagerArea = pathname === '/manager' || pathname.startsWith('/manager/');
  const isOperatorArea = pathname === '/operator' || pathname.startsWith('/operator/');
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');
  const isLoginPage = pathname === '/login';
  const isExpiredSessionLogin = isLoginPage && request.nextUrl.searchParams.get('session') === 'expired';

  // Let the login screen load once for a session rejected by requireAuth(),
  // and remove the stale cookie that would otherwise bounce it back to a
  // protected route indefinitely.
  if (isExpiredSessionLogin) {
    const response = NextResponse.next();
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // Not authenticated → protected areas go to login
  if (!role) {
    if (isManagerArea || isOperatorArea || isAdminArea) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Non-admin attempting admin area → DENIED, bounce to own workspace
  if (isAdminArea && role !== 'ADMIN') {
    if (role === 'MANAGER') {
      return NextResponse.redirect(new URL('/manager/dashboard', request.url));
    }
    if (role === 'OPERATOR') {
      return NextResponse.redirect(new URL('/operator/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Non-manager attempting manager area → DENIED, bounce to own workspace
  if (isManagerArea && role !== 'MANAGER') {
    return NextResponse.redirect(new URL(role === 'ADMIN' ? '/admin/dashboard' : '/operator/dashboard', request.url));
  }

  // Non-operator attempting operator-only area → bounce to own workspace
  if (isOperatorArea && role !== 'OPERATOR') {
    return NextResponse.redirect(new URL(role === 'ADMIN' ? '/admin/dashboard' : '/manager/dashboard', request.url));
  }

  // Logged-in user on the login page → send to their workspace
  if (isLoginPage) {
    return NextResponse.redirect(
      new URL(role === 'ADMIN' ? '/admin/dashboard' : role === 'MANAGER' ? '/manager/dashboard' : '/operator/dashboard', request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
};
