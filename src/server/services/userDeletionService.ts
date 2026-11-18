import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export interface UserDeletionBlocker {
  label: string;
  count: number;
}

type UserDeletionDbClient = PrismaClient | Prisma.TransactionClient;

/** Lists every known user-owned/history relation that must remain intact on account deletion. */
export async function getUserDeletionBlockers(
  userId: string,
  client: UserDeletionDbClient = prisma
): Promise<UserDeletionBlocker[]> {
  const [schedules, attendances, attendanceVerifications, leaveRequests, leaveApprovalHistory, reviewedLeaves, requestedExchanges,
    targetExchanges, reviewedExchanges, outgoingHandovers, incomingHandovers, hsseChecklists,
    notifications, auditLogs, programPics, programEvidenceUploads, programProgressLogs, programUpdates,
    programScheduleHistory, programRealizationLogs, taskCompletions, targetedAnnouncements, announcements, operationalReports, dataImports,
    infoOrfReports, cargoUpdates, teamAssignments] = await Promise.all([
    client.schedule.count({ where: { userId } }),
    client.attendance.count({ where: { userId } }),
    client.attendance.count({ where: { verifiedBy: userId } }),
    client.leaveRequest.count({ where: { userId } }),
    client.leaveRequest.count({ where: { OR: [{ reviewerId: userId }, { teamLeadId: userId }, { managerId: userId }] } }),
    client.leaveRequest.count({ where: { reviewedById: userId } }),
    client.shiftExchange.count({ where: { requesterId: userId } }),
    client.shiftExchange.count({ where: { targetUserId: userId } }),
    client.shiftExchange.count({ where: { reviewedById: userId } }),
    client.handover.count({ where: { outgoingOperatorId: userId } }),
    client.handover.count({ where: { incomingOperatorId: userId } }),
    client.hSSEChecklist.count({ where: { operatorId: userId } }),
    client.notification.count({ where: { userId } }),
    client.auditLog.count({ where: { userId } }),
    client.programKerja.count({ where: { picId: userId } }),
    client.programKerja.count({ where: { evidenceUploadedById: userId } }),
    client.programKerjaProgressLog.count({ where: { userId } }),
    client.programUpdate.count({ where: { userId } }),
    client.programKerjaScheduleHistory.count({ where: { changedById: userId } }),
    client.programKerjaRealizationLog.count({ where: { changedById: userId } }),
    client.programKerjaTask.count({ where: { doneById: userId } }),
    client.announcement.count({ where: { targetType: 'OPERATOR', targetId: userId } }),
    client.announcement.count({ where: { createdById: userId } }),
    client.operationalReport.count({ where: { uploadedById: userId } }),
    client.dataImport.count({ where: { importedById: userId } }),
    client.infoOrfReport.count({ where: { recordedById: userId } }),
    client.nextCargo.count({ where: { lastUpdatedById: userId } }),
    client.teamConfig.count({ where: { OR: [{ reviewerId: userId }, { teamLeadId: userId }, { managerId: userId }] } }),
  ]);

  const counts: [string, number][] = [
    ['jadwal operator', schedules], ['absensi', attendances], ['validasi absensi oleh akun', attendanceVerifications], ['pengajuan cuti/izin milik akun', leaveRequests],
    ['riwayat peran approver pada pengajuan cuti/izin', leaveApprovalHistory], ['keputusan cuti/izin', reviewedLeaves],
    ['pengajuan pergantian shift sebagai pemohon', requestedExchanges], ['pengajuan pergantian shift sebagai target', targetExchanges],
    ['keputusan pergantian shift', reviewedExchanges], ['serah terima shift sebagai operator keluar', outgoingHandovers],
    ['serah terima shift sebagai operator masuk', incomingHandovers], ['checklist HSSE', hsseChecklists],
    ['notifikasi', notifications], ['audit log aktivitas', auditLogs], ['program kerja sebagai PIC', programPics],
    ['unggahan bukti program kerja', programEvidenceUploads], ['riwayat progres program kerja', programProgressLogs],
    ['riwayat update program kerja', programUpdates], ['riwayat perubahan jadwal program', programScheduleHistory],
    ['riwayat realisasi program', programRealizationLogs], ['penyelesaian tugas program kerja', taskCompletions],
    ['pengumuman yang ditargetkan kepada akun', targetedAnnouncements], ['pengumuman yang dibuat', announcements],
    ['laporan operasional yang diunggah', operationalReports], ['riwayat impor data', dataImports],
    ['laporan Info ORF', infoOrfReports], ['pembaruan Next Cargo', cargoUpdates],
    ['penugasan Reviewer/Team Lead/Manager pada TeamConfig', teamAssignments],
  ];
  return counts.filter(([, count]) => count > 0).map(([label, count]) => ({ label, count }));
}
