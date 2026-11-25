import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { formatJakartaDate } from '@/lib/time';
import { getLeaveQuotaSummary } from '@/server/services/leaveQuotaService';
import LeaveQuotaClient from './LeaveQuotaClient';

export default async function LeaveQuotasPage() {
  await requireAdmin();
  const today = formatJakartaDate();
  const start = `${today.slice(0, 7)}-01`;
  const end = `${today.slice(0, 7)}-31`;
  const [teams, quotas] = await Promise.all([
    prisma.user.findMany({ where: { role: 'OPERATOR', team: { not: null } }, distinct: ['team'], select: { team: true }, orderBy: { team: 'asc' } }),
    getLeaveQuotaSummary(start, end),
  ]);
  return <LeaveQuotaClient teams={teams.flatMap((item) => item.team ? [item.team] : [])} quotas={quotas} />;
}
