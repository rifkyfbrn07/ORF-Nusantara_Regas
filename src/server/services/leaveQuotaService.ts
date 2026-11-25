import { LeaveType, Prisma, RequestStatus } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

function datesBetween(start: string, end: string) {
  const result: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last && result.length < 400) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

async function usedByDate(team: string, date: string, tx: typeof prisma | Prisma.TransactionClient = prisma, excludeId?: string) {
  const approvals = await tx.leaveRequest.findMany({
    where: {
      type: LeaveType.LEAVE,
      status: RequestStatus.APPROVED,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startDate: { lte: date },
      endDate: { gte: date },
      OR: [
        { teamSnapshot: team, requesterRoleSnapshot: 'OPERATOR' },
        { teamSnapshot: null, user: { team, role: 'OPERATOR' } },
      ],
    },
    select: { userId: true },
  });
  return new Set(approvals.map(({ userId }) => userId)).size;
}

export async function getLeaveQuotaAvailability(team: string, startDate: string, endDate: string) {
  const dates = datesBetween(startDate, endDate);
  const quotas = await prisma.leaveQuota.findMany({ where: { team, date: { in: dates } } });
  const byDate = new Map(quotas.map((quota) => [quota.date, quota]));
  return Promise.all(dates.map(async (date) => {
    const quota = byDate.get(date);
    if (!quota) return { date, maxOperators: null, approvedCount: null, remaining: null, full: false };
    const approvedCount = await usedByDate(team, date);
    return { date, maxOperators: quota.maxOperators, approvedCount, remaining: Math.max(0, quota.maxOperators - approvedCount), full: approvedCount >= quota.maxOperators };
  }));
}

export async function assertLeaveQuotaAvailable(
  tx: Prisma.TransactionClient,
  input: { team: string; startDate: string; endDate: string; excludeRequestId?: string },
) {
  const dates = datesBetween(input.startDate, input.endDate);
  // Serialize final approvals by team/day so concurrent approvals cannot pass on stale counts.
  for (const date of dates) await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`leave-quota:${input.team}:${date}`}))`;
  const quotas = await tx.leaveQuota.findMany({ where: { team: input.team, date: { in: dates } } });
  const byDate = new Map(quotas.map((quota) => [quota.date, quota]));
  const fullDates: string[] = [];
  for (const date of dates) {
    const quota = byDate.get(date);
    if (!quota) continue;
    const approvedCount = await usedByDate(input.team, date, tx, input.excludeRequestId);
    if (approvedCount >= quota.maxOperators) fullDates.push(date);
  }
  if (fullDates.length) throw new Error(`Kuota cuti Tim ${input.team} penuh pada tanggal: ${fullDates.join(', ')}.`);
}

export async function getLeaveQuotaSummary(from: string, to: string) {
  const quotas = await prisma.leaveQuota.findMany({ where: { date: { gte: from, lte: to } }, orderBy: [{ team: 'asc' }, { date: 'asc' }] });
  return Promise.all(quotas.map(async (quota) => {
    const approvedCount = await usedByDate(quota.team, quota.date);
    return { ...quota, approvedCount, remaining: Math.max(0, quota.maxOperators - approvedCount) };
  }));
}
