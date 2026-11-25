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
  leadOperatorId?: string;
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
    const leadOperator = input.leadOperatorId?.trim()
      ? await prisma.user.findUnique({ where: { id: input.leadOperatorId.trim() }, select: { role: true, isActive: true } })
      : null;
    if (input.leadOperatorId?.trim() && (!leadOperator?.isActive || leadOperator.role !== Role.LEAD_OPERATOR)) {
      return { success: false, error: 'Lead Operator harus akun aktif dengan role LEAD_OPERATOR.' };
    }

    let notifiedWaitingTeamLeadRequests = 0;
    let notifiedWaitingLeadOperatorRequests = 0;
    await prisma.$transaction(async (tx) => {
      const previousConfig = await tx.teamConfig.findUnique({
        where: { code: team },
        select: { teamLeadId: true, leadOperatorId: true },
      });
      const config = await tx.teamConfig.upsert({
        where: { code: team },
        create: {
          code: team,
          name: `Tim ${team}`,
          reviewerId: input.reviewerId.trim() || null,
          teamLeadId: input.teamLeadId.trim() || null,
          managerId: input.managerId.trim() || null,
          leadOperatorId: input.leadOperatorId?.trim() || null,
        },
        update: {
          reviewerId: input.reviewerId.trim() || null,
          teamLeadId: input.teamLeadId.trim() || null,
          managerId: input.managerId.trim() || null,
          ...(input.leadOperatorId !== undefined ? { leadOperatorId: input.leadOperatorId.trim() || null } : {}),
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
            link: '/approval-inbox',
          }, tx);
        }
      }
      const nextLeadOperatorId = input.leadOperatorId?.trim() || null;
      if (nextLeadOperatorId && previousConfig?.leadOperatorId !== nextLeadOperatorId) {
        const waiting = await tx.leaveRequest.findMany({ where: { status: 'PENDING', approvalStage: 'LEAD_OPERATOR', user: { team } }, select: { id: true, type: true, startDate: true, endDate: true, user: { select: { name: true } } } });
        notifiedWaitingLeadOperatorRequests = waiting.length;
        for (const request of waiting) await createNotification({
          userId: nextLeadOperatorId,
          type: 'LEAVE_STATUS',
          title: `Pengajuan ${request.type} menunggu persetujuan Lead Operator`,
          message: `Permohonan ${request.type} ${request.user.name} (${request.startDate} s/d ${request.endDate}) menunggu persetujuan Lead Operator Tim ${team}.`,
          link: '/approval-inbox',
        }, tx);
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
          leadOperatorId: input.leadOperatorId?.trim() || null,
          notifiedWaitingTeamLeadRequests,
          notifiedWaitingLeadOperatorRequests,
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

export async function setGlobalTeamLeaderAction(userId: string) {
  try {
    const admin = await requireAdmin();
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, isActive: true } });
    if (!target || !target.isActive || target.role === Role.ADMIN) return { success: false, error: 'Global Team Leader harus akun aktif non-Admin.' };
    const normalizedName = target.name.toLocaleLowerCase('id-ID').replace(/\./g, '').replace(/\s+/g, ' ').trim();
    if (normalizedName !== 'm t ibrahim') return { success: false, error: 'Pemetaan Global Team Leader hanya boleh menggunakan akun M. T. Ibrahim.' };
    await prisma.$transaction(async (tx) => {
      const previous = await tx.globalApprovalConfig.findUnique({ where: { id: 'global-team-leader' }, select: { teamLeadId: true } });
      const mapping = await tx.globalApprovalConfig.upsert({ where: { id: 'global-team-leader' }, create: { id: 'global-team-leader', teamLeadId: target.id }, update: { teamLeadId: target.id } });
      if (previous?.teamLeadId !== target.id) {
        const waiting = await tx.leaveRequest.findMany({ where: { status: 'PENDING', approvalStage: 'GLOBAL_TEAM_LEAD' }, select: { id: true, type: true, startDate: true, endDate: true, user: { select: { name: true, team: true } } } });
        for (const request of waiting) await createNotification({
          userId: target.id,
          type: 'LEAVE_STATUS',
          title: `Pengajuan ${request.type} menunggu persetujuan Team Lead`,
          message: `Permohonan ${request.type} ${request.user.name} (Tim ${request.user.team || '-'}) periode ${request.startDate} s/d ${request.endDate} menunggu persetujuan Global Team Leader.`,
          link: '/approval-inbox',
        }, tx);
      }
      const audit = await recordAuditLog({ userId: admin.id, action: 'ADMIN_SET_GLOBAL_TEAM_LEADER', entity: 'GlobalApprovalConfig', entityId: mapping.id, metadata: { userId: target.id, name: target.name } }, tx);
      if (!audit) throw new Error('Audit gagal.');
    });
    revalidatePath('/admin/users'); revalidatePath('/approval-inbox'); revalidatePath('/');
    return { success: true };
  } catch (error) { return { success: false, error: error instanceof Error && error.message === 'Audit gagal.' ? error.message : 'Gagal memetakan Global Team Leader.' }; }
}

export async function setTeamLeadOperatorAction(input: { team: string; userId: string }) {
  try {
    const admin = await requireAdmin();
    const team = input.team.trim().toUpperCase();
    const config = await prisma.teamConfig.findUnique({ where: { code: team } });
    if (!config) return { success: false, error: `Konfigurasi tim ${team} belum tersedia.` };
    const target = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, name: true, role: true, isActive: true } });
    if (!target || !target.isActive || target.role !== Role.LEAD_OPERATOR) return { success: false, error: 'Pilih akun aktif dengan role Lead Operator.' };
    await prisma.$transaction(async (tx) => {
      await tx.teamConfig.update({ where: { code: team }, data: { leadOperatorId: target.id } });
      const audit = await recordAuditLog({ userId: admin.id, action: 'ADMIN_SET_LEAD_OPERATOR', entity: 'TeamConfig', entityId: config.id, metadata: { team, userId: target.id, name: target.name } }, tx);
      if (!audit) throw new Error('Audit gagal.');
    });
    revalidatePath('/admin/users'); revalidatePath('/approval-inbox'); revalidatePath('/operator/requests');
    return { success: true };
  } catch (error) { return { success: false, error: error instanceof Error && error.message === 'Audit gagal.' ? error.message : 'Gagal memetakan Lead Operator.' }; }
}
