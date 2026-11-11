'use server';

import { revalidatePath } from 'next/cache';
import { Role } from '@prisma/client';
import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { recordAuditLog } from '@/server/services/auditService';
import { createNotification } from '@/server/services/notificationService';

export async function updateTeamApprovalConfigAction(input: {
  team: string;
  reviewerId: string;
  teamLeadId: string;
  managerId: string;
}) {
  try {
    const admin = await requireAdmin();
    const team = input.team.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{1,20}$/.test(team)) {
      return { success: false, error: 'Kode tim tidak valid.' };
    }

    const existingConfig = await prisma.teamConfig.findUnique({
      where: { code: team },
      select: { id: true },
    });
    const operator = await prisma.user.findFirst({
      where: { role: Role.OPERATOR, team },
      select: { id: true },
    });
    if (!existingConfig && !operator) {
      return { success: false, error: 'Tim tidak ditemukan pada data operator.' };
    }

    const assignments = [
      { id: input.reviewerId.trim(), label: 'Reviewer', requiresManager: false },
      { id: input.teamLeadId.trim(), label: 'Team Lead', requiresManager: false },
      { id: input.managerId.trim(), label: 'Manager', requiresManager: true },
    ].filter((assignment) => assignment.id);
    if (input.teamLeadId.trim() && input.teamLeadId.trim() === input.managerId.trim()) {
      return { success: false, error: 'Team Lead harus berbeda dari Manager agar tahap persetujuan tidak digabung.' };
    }
    const accounts = await prisma.user.findMany({
      where: { id: { in: assignments.map(({ id }) => id) } },
      select: { id: true, role: true, isActive: true },
    });
    const accountById = new Map(accounts.map((account) => [account.id, account]));
    for (const assignment of assignments) {
      const account = accountById.get(assignment.id);
      if (!account || !account.isActive || account.role === Role.ADMIN) {
        return { success: false, error: `${assignment.label} harus dipetakan ke akun aktif non-Admin.` };
      }
      if (assignment.requiresManager && account.role !== Role.MANAGER) {
        return { success: false, error: 'Manager harus dipetakan ke akun dengan role MANAGER.' };
      }
    }

    let notifiedWaitingTeamLeadRequests = 0;
    await prisma.$transaction(async (tx) => {
      const previousConfig = await tx.teamConfig.findUnique({
        where: { code: team },
        select: { teamLeadId: true },
      });
      const config = await tx.teamConfig.upsert({
        where: { code: team },
        create: {
          code: team,
          name: `Tim ${team}`,
          reviewerId: input.reviewerId.trim() || null,
          teamLeadId: input.teamLeadId.trim() || null,
          managerId: input.managerId.trim() || null,
        },
        update: {
          reviewerId: input.reviewerId.trim() || null,
          teamLeadId: input.teamLeadId.trim() || null,
          managerId: input.managerId.trim() || null,
        },
        select: { id: true },
      });
      const nextTeamLeadId = input.teamLeadId.trim() || null;
      if (nextTeamLeadId && previousConfig?.teamLeadId !== nextTeamLeadId) {
        const waitingRequests = await tx.leaveRequest.findMany({
          where: {
            status: 'PENDING',
            approvalStage: 'TEAM_LEAD',
            user: { team },
          },
          select: {
            id: true,
            type: true,
            startDate: true,
            endDate: true,
            user: { select: { name: true } },
          },
        });
        notifiedWaitingTeamLeadRequests = waitingRequests.length;
        for (const request of waitingRequests) {
          await createNotification({
            userId: nextTeamLeadId,
            type: 'LEAVE_STATUS',
            title: `Pengajuan ${request.type} menunggu persetujuan Team Lead`,
            message: `Permohonan ${request.type} ${request.user.name} (${request.startDate} s/d ${request.endDate}) menunggu persetujuan Team Lead. Mapping tim kini tersedia.`,
            link: '/operator/requests?tab=approvals',
          }, tx);
        }
      }
      const auditLog = await recordAuditLog({
        userId: admin.id,
        action: 'ADMIN_UPDATE_TEAM_APPROVAL_CONFIG',
        entity: 'TeamConfig',
        entityId: config.id,
        metadata: {
          team,
          reviewerId: input.reviewerId.trim() || null,
          teamLeadId: input.teamLeadId.trim() || null,
          managerId: input.managerId.trim() || null,
          notifiedWaitingTeamLeadRequests,
        },
      }, tx);
      if (!auditLog) throw new Error('Gagal mencatat audit konfigurasi approval.');
    });

    revalidatePath('/admin/users');
    revalidatePath('/operator/requests');
    revalidatePath('/manager/requests');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error && error.message === 'Gagal mencatat audit konfigurasi approval.'
        ? error.message
        : 'Gagal memperbarui pemetaan approver.',
    };
  }
}
