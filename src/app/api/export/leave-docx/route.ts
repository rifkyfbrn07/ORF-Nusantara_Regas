import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { generateLeaveDocx, LeaveDocData } from '@/server/services/leaveDocxService';
import { getLeaveEntitlement } from '@/server/services/leaveService';
import { recordAuditLog } from '@/server/services/auditService';
import { RequestStatus } from '@prisma/client';
import { assertApprovalAuthority, type ApprovalStage } from '@/server/services/leaveService';

export async function GET(req: NextRequest) {
  try {
    const sessionToken = await getSession();
    if (!sessionToken) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const session = await prisma.user.findUnique({
      where: { id: sessionToken.id },
      select: { id: true, role: true, isActive: true },
    });
    if (!session?.isActive) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');
    if (!requestId) {
      return new NextResponse('Missing requestId parameter', { status: 400 });
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          include: { department: true },
        },
        reviewedBy: true,
      },
    });

    if (!leaveRequest) {
      return new NextResponse('Permohonan cuti tidak ditemukan', { status: 404 });
    }

    // Operators may preview their own request or one actively assigned to them.
    // Team Lead/Reviewer assignments are explicit in TeamConfig; role OPERATOR
    // alone never grants access to another operator's document.
    if (session.role === 'OPERATOR' && leaveRequest.userId !== session.id) {
      const activeStages: ApprovalStage[] = ['REVIEWER', 'TEAM_LEAD'];
      const stage = leaveRequest.approvalStage as ApprovalStage;
      if (leaveRequest.status !== RequestStatus.PENDING || !activeStages.includes(stage)) {
        return new NextResponse('Forbidden: Anda tidak berhak mengunduh dokumen cuti operator lain', { status: 403 });
      }
      const approver = await prisma.user.findUnique({
        where: { id: session.id },
        select: { id: true, role: true, isActive: true },
      });
      if (!approver) {
        return new NextResponse('Forbidden: Akun approver tidak ditemukan', { status: 403 });
      }
      try {
        await assertApprovalAuthority({ userId: leaveRequest.userId }, approver, stage);
      } catch {
        return new NextResponse('Forbidden: Pengajuan ini bukan bagian dari inbox persetujuan Anda', { status: 403 });
      }
    }

    // Calculate leave days
    const start = new Date(leaveRequest.startDate);
    const end = new Date(leaveRequest.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const leaveDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Hak cuti dihitung mengikuti aturan existing (getLeaveEntitlement),
    // sehingga angka pada dokumen selalu konsisten dengan data sumber.
    const entitlement = await getLeaveEntitlement(leaveRequest.userId, leaveRequest.startDate);
    const cutiTelahDiambil = entitlement.cutiTelahDiambil;

    const hakCutiBerjalan = entitlement.hakCutiBerjalan;
    const cutiBesar = entitlement.cutiBesar;
    const sisaCuti = entitlement.sisaCuti;

    const teamConfig = leaveRequest.user.team
      ? await prisma.teamConfig.findUnique({ where: { code: leaveRequest.user.team } })
      : null;
    const reviewerApproverId = leaveRequest.reviewerId || teamConfig?.reviewerId || null;
    const assignedTeamLeadId = teamConfig?.teamLeadId && teamConfig.teamLeadId !== teamConfig.managerId
      ? teamConfig.teamLeadId
      : null;
    const teamLeadApproverId = leaveRequest.teamLeadId || assignedTeamLeadId;
    const managerApproverId = leaveRequest.managerId || teamConfig?.managerId || null;
    const approverIds = [reviewerApproverId, teamLeadApproverId, managerApproverId]
      .filter((id): id is string => Boolean(id));
    const approverAccounts = await prisma.user.findMany({
      where: { id: { in: approverIds } },
      select: { id: true, name: true, position: true },
    });
    const approverById = new Map(approverAccounts.map((account) => [account.id, account]));

    // Formatted Indonesian dates
    const INDO_MONTHS = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    const formatIndoDate = (dStr: string) => {
      const parts = dStr.split('-');
      if (parts.length < 3) return dStr;
      const day = parseInt(parts[2], 10);
      const month = INDO_MONTHS[parseInt(parts[1], 10) - 1];
      const year = parts[0];
      return `${day} ${month} ${year}`;
    };

    const formatIndoRange = (startStr: string, endStr: string) => {
      if (startStr === endStr) return formatIndoDate(startStr);
      const pStart = startStr.split('-');
      const pEnd = endStr.split('-');
      if (pStart[0] === pEnd[0] && pStart[1] === pEnd[1]) {
        const month = INDO_MONTHS[parseInt(pStart[1], 10) - 1];
        return `${parseInt(pStart[2], 10)} - ${parseInt(pEnd[2], 10)} ${month} ${pStart[0]}`;
      }
      return `${formatIndoDate(startStr)} s/d ${formatIndoDate(endStr)}`;
    };
    const formatApprovalTimestamp = (value: Date | null) => value
      ? new Intl.DateTimeFormat('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Jakarta',
        }).format(value)
      : '-';

    // Parse extra metadata if stored in reason (or fallback)
    let alamatCuti = 'Simo Mulyo Baru 7J no 35 Surabaya, Jawa Timur';
    let penyerahanTugas = '-';
    let telepon = leaveRequest.user.phone || '082230228483';

    if (leaveRequest.reason && leaveRequest.reason.includes('|||')) {
      const [, metaJson] = leaveRequest.reason.split('|||');
      try {
        const meta = JSON.parse(metaJson.trim());
        if (meta.alamat) alamatCuti = meta.alamat;
        if (meta.penyerahanTugas) penyerahanTugas = meta.penyerahanTugas;
        if (meta.telepon) telepon = meta.telepon;
      } catch {}
    }

    const submissionDate = leaveRequest.createdAt
      ? formatIndoDate(leaveRequest.createdAt.toISOString().substring(0, 10))
      : formatIndoDate(leaveRequest.startDate);

    const approvalDate = formatApprovalTimestamp(leaveRequest.managerApprovedAt);

    const approvalDecision = (stage: 'REVIEWER' | 'TEAM_LEAD' | 'MANAGER', decidedAt: Date | null) => {
      if (decidedAt) {
        return leaveRequest.status === RequestStatus.REJECTED && leaveRequest.approvalStage === stage
          ? 'DITOLAK'
          : 'DISETUJUI';
      }
      if (leaveRequest.status === RequestStatus.REJECTED) return 'TIDAK DIPROSES';
      if (leaveRequest.status === RequestStatus.PENDING && leaveRequest.approvalStage === stage) {
        return 'MENUNGGU';
      }
      return 'BELUM DIPROSES';
    };
    const approvalSummary = (
      label: string,
      stage: 'REVIEWER' | 'TEAM_LEAD' | 'MANAGER',
      approverId: string | null,
      decidedAt: Date | null,
    ) => {
      const approver = approverId ? approverById.get(approverId) : null;
      const approverName = approver?.name || (approverId ? 'Akun approver tidak tersedia' : 'Belum ditetapkan');
      const position = approver?.position ? ` (${approver.position})` : '';
      const date = formatApprovalTimestamp(decidedAt);
      return `${label}: ${approverName}${position}\n${approvalDecision(stage, decidedAt)} • ${date}`;
    };
    const managerName = managerApproverId ? approverById.get(managerApproverId)?.name : null;
    const managerDecision = approvalDecision('MANAGER', leaveRequest.managerApprovedAt);
    const managerPosition = managerApproverId ? approverById.get(managerApproverId)?.position : null;

    const docData: LeaveDocData = {
      isDraft: leaveRequest.status !== RequestStatus.APPROVED,
      namaPekerja: leaveRequest.user.name,
      nip: leaveRequest.user.employeeId,
      jabatan: leaveRequest.user.position || 'Penunjang Pengoperasian ORF',
      satuanKerja: leaveRequest.user.department?.name || 'Operasi',
      tanggalMasuk: entitlement.tanggalMasuk,
      hakCutiBerjalan,
      cutiBesar,
      cutiTelahDiambil,
      sisaCuti,
      periodePengambilan: entitlement.periodePengambilan,
      jumlahHari: leaveDays,
      terhitungSejak: formatIndoRange(leaveRequest.startDate, leaveRequest.endDate),
      perihalCuti: leaveRequest.type === 'LEAVE' ? 'Cuti Tahunan' : leaveRequest.type === 'SICK' ? 'Sakit' : 'Izin / Dispensasi',
      telepon,
      alamatCuti,
      tanggalPengajuan: submissionDate,
      pemohonNama: leaveRequest.user.name,
      tanggalPersetujuan: approvalDate,
      selamaHari: leaveDays,
      penyerahanTugas,
      // Nama approver berasal dari assignment aktual; konfigurasi kosong
      // ditampilkan secara eksplisit dan tidak memakai nama fallback template.
      menyetujuiNama: leaveRequest.managerName || managerName || 'Belum ditetapkan',
      managerRoleLine: `Manager • ${managerDecision}`,
      managerDateLine: `${managerPosition || 'Jabatan: -'} • Tanggal: ${approvalDate}`,
      reviewerSummary: approvalSummary('Team Reviewer', 'REVIEWER', reviewerApproverId, leaveRequest.reviewerApprovedAt),
      teamLeadSummary: approvalSummary('Team Lead', 'TEAM_LEAD', teamLeadApproverId, leaveRequest.teamLeadApprovedAt),
    };

    const docxBuffer = await generateLeaveDocx(docData);

    const filename = `Formulir Permohonan Cuti - ${leaveRequest.user.name} - ${leaveRequest.startDate}.docx`;
    const docStatus = leaveRequest.status === RequestStatus.APPROVED ? 'FINAL' : 'DRAFT';

    // Audit trail: jejak unduhan evidence (draft/final) untuk traceability.
    await recordAuditLog({
      userId: session.id,
      action: docStatus === 'FINAL' ? 'EXPORT_LEAVE_DOCX_FINAL' : 'EXPORT_LEAVE_DOCX_DRAFT',
      entity: 'LeaveRequest',
      entityId: leaveRequest.id,
      metadata: {
        targetUserId: leaveRequest.userId,
        targetUserName: leaveRequest.user.name,
        status: leaveRequest.status,
        approvalStage: leaveRequest.approvalStage,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        docStatus,
      },
    });

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'X-Document-Status': docStatus,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    console.error('[leave-docx] Error generating docx:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Gagal menghasilkan dokumen cuti',
      { status: 500 }
    );
  }
}
