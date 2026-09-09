/**
 * TEMPORARY smoke test — deleted after validation.
 * Signs real JWT session cookies and checks role-based page access.
 */
import { SignJWT } from 'jose';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET!;

async function makeToken(u: { id: string; name: string; email: string | null; employeeId: string; role: string; position: string }) {
  return new SignJWT({ ...u, email: u.email || '', departmentId: null, avatarUrl: null })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(AUTH_SECRET));
}

async function check(label: string, path: string, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { cookie: `fieldops_session_token=${token}` } : {},
    redirect: 'manual',
  });
  console.log(`${res.status}  ${label}  ${path}`);
}

async function main() {
  const [admin, manager, operator] = await Promise.all([
    prisma.user.findUnique({ where: { email: 'admin@fieldops.local' } }),
    prisma.user.findUnique({ where: { email: 'manager@fieldops.local' } }),
    prisma.user.findUnique({ where: { email: 'operator1@fieldops.local' } }),
  ]);
  if (!admin || !manager || !operator) throw new Error('required test users missing');

  const adminToken = await makeToken(admin);
  const managerToken = await makeToken(manager);
  const operatorToken = await makeToken(operator);

  await check('admin', '/admin/dashboard', adminToken);
  await check('admin users', '/admin/users', adminToken);
  await check('op', '/operator/dashboard', operatorToken);
  await check('op', '/operator/schedule?view=month', operatorToken);
  await check('op->mgr dashboard', '/manager/dashboard', operatorToken);
  await check('mgr', '/manager/dashboard', managerToken);
  await check('mgr', '/manager/announcements', managerToken);
  await check('anonymous', '/manager/dashboard');
}

main()
  .catch((e) => {
    console.error('SMOKE ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
