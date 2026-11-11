import { prisma } from '@/lib/db/prisma';
import { getLeaveEntitlement, processLeaveApproval } from '@/server/services/leaveService';

const requestId = 'cmwbhc92j0005l408w1v88eg0';
const operatorId = 'cmtqzuio4000jy7ckkj9y43gn';
const managerId = 'cmtqxvyso0001l304bdx3hlat';
const dates = ['2026-11-26', '2026-11-27', '2026-11-28'];

async function main() {
  const [before, entitlementBefore, manager, schedulesBefore] = await Promise.all([
    prisma.leaveRequest.findUnique({
      where: { id: requestId },
      select: {
        status: true,
        approvalStage: true,
        reviewerId: true,
        reviewerApprovedAt: true,
        teamLeadId: true,
        teamLeadApprovedAt: true,
        managerApprovedAt: true,
        userId: true,
        type: true,
        startDate: true,
        endDate: true,
      },
    }),
    getLeaveEntitlement(operatorId, '2026-11-11'),
    prisma.user.findUnique({
      where: { id: managerId },
      select: { role: true, isActive: true },
    }),
    prisma.schedule.findMany({
      where: { userId: operatorId, date: { in: dates } },
      select: {
        date: true,
        status: true,
        attendances: { select: { checkIn: true } },
      },
    }),
  ]);
  if (!before
    || before.status !== 'PENDING'
    || before.approvalStage !== 'MANAGER'
    || before.userId !== operatorId
    || before.reviewerId !== 'cmtqzuie8000hy7ckdy51k2mv'
    || before.reviewerApprovedAt === null
    || before.teamLeadId !== 'cmtqzui73000fy7ckazvdt93f'
    || before.teamLeadApprovedAt === null
    || before.managerApprovedAt !== null
    || before.type !== 'LEAVE'
    || before.startDate !== dates[0]
    || before.endDate !== dates[2]
    || manager?.role !== 'MANAGER'
    || !manager.isActive) {
    throw new Error('Final approval preconditions do not match the test request and assigned Manager.');
  }

  await processLeaveApproval({
    requestId,
    approverId: managerId,
    stage: 'MANAGER',
    status: 'APPROVED',
    note: 'Verifikasi approval final Manager Tim B.',
  });

  const [request, schedules, entitlementAfter, auditLogs] = await Promise.all([
    prisma.leaveRequest.findUnique({
      where: { id: requestId },
      select: {
        status: true,
        approvalStage: true,
        reviewerId: true,
        reviewerApprovedAt: true,
        teamLeadId: true,
        teamLeadApprovedAt: true,
        managerId: true,
        managerName: true,
        managerApprovedAt: true,
        managerNote: true,
        finalizedAt: true,
      },
    }),
    prisma.schedule.findMany({
      where: { userId: operatorId, date: { in: dates } },
      orderBy: { date: 'asc' },
      select: { date: true, status: true, notes: true },
    }),
    getLeaveEntitlement(operatorId, '2026-11-11'),
    prisma.auditLog.findMany({
      where: {
        action: { in: ['APPROVE_LEAVE_REVIEWER', 'APPROVE_LEAVE_TEAM_LEAD', 'APPROVE_LEAVE_MANAGER'] },
        entity: 'LeaveRequest',
        entityId: requestId,
      },
      orderBy: { createdAt: 'asc' },
      select: { userId: true, action: true },
    }),
  ]);
  const checks = {
    requestFinalized: request?.status === 'APPROVED'
      && request.approvalStage === 'MANAGER'
      && request.managerId === managerId
      && request.managerApprovedAt !== null
      && request.finalizedAt !== null,
    reviewerAndTeamLeadHistoryPreserved: request?.reviewerId === before.reviewerId
      && request.reviewerApprovedAt?.getTime() === before.reviewerApprovedAt?.getTime()
      && request.teamLeadId === before.teamLeadId
      && request.teamLeadApprovedAt?.getTime() === before.teamLeadApprovedAt?.getTime(),
    allThreeApprovalAuditsPresent: auditLogs.some(({ action }) => action === 'APPROVE_LEAVE_REVIEWER')
      && auditLogs.some(({ action, userId }) => action === 'APPROVE_LEAVE_TEAM_LEAD'
        && userId === before.teamLeadId)
      && auditLogs.some(({ action, userId }) => action === 'APPROVE_LEAVE_MANAGER'
        && userId === managerId),
    leaveBalanceChangedByRequestedDays: entitlementAfter.cutiTelahDiambil - entitlementBefore.cutiTelahDiambil === 3,
    schedulesSetOffWithoutOverwritingAttendance: schedules.length === 3 && schedules.every((schedule) => {
      const previous = schedulesBefore.find(({ date }) => date === schedule.date);
      const attended = previous?.attendances.some(({ checkIn }) => checkIn !== null) ?? false;
      return attended ? schedule.status === previous?.status : schedule.status === 'OFF';
    }),
  };
  if (Object.values(checks).some((passed) => !passed)) {
    throw new Error(`Manager final verification failed: ${JSON.stringify(checks)}`);
  }
  console.log(JSON.stringify({
    success: true,
    checks,
    request,
    schedules,
    leaveBalance: {
      before: entitlementBefore.cutiTelahDiambil,
      after: entitlementAfter.cutiTelahDiambil,
      daysDeducted: entitlementAfter.cutiTelahDiambil - entitlementBefore.cutiTelahDiambil,
    },
    auditLogs,
  }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error('MANAGER_FINAL_APPROVAL_TEST_FAILED', error instanceof Error ? error.message : 'Unknown error');
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
