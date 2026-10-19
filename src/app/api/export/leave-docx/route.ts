import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { generateLeaveDocx, LeaveDocData } from '@/server/services/leaveDocxService';
import { getLeaveEntitlement } from '@/server/services/leaveService';
import { recordAuditLog } from '@/server/services/auditService';
import { RequestStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
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

    // Permission check: Operator can only download their own request.
    if (session.role === 'OPERATOR' && leaveRequest.userId !== session.id) {
      return new NextResponse('Forbidden: Anda tidak berhak mengunduh dokumen cuti operator lain', { status: 403 });
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

    const approvalDate = leaveRequest.status === RequestStatus.APPROVED && leaveRequest.reviewedAt
      ? formatIndoDate(leaveRequest.reviewedAt.toISOString().substring(0, 10))
      : '-';

    const docData: LeaveDocData = {
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
      // Tanda tangan diisi dari data approval yang benar-benar tersimpan;
      // fallback mempertahankan nama statis dari template apabila belum tersimpan.
      menyetujuiNama: leaveRequest.managerName || 'Isa Taufiq',
      mengetahuiNama:
        leaveRequest.teamLeadName ||
        leaveRequest.reviewerName ||
        leaveRequest.reviewedBy?.name ||
        'Yosep Ismail Zulkarnain',
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
