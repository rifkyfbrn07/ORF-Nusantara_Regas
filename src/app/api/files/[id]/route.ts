import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getStoredFileContent } from '@/server/services/googleDriveService';

type FileRecord = { fileName: string | null; mimeType: string | null };

async function findAuthorizedFile(fileId: string, userId: string, role: string): Promise<FileRecord | null> {
  const leave = await prisma.leaveRequest.findFirst({
    where: { driveFileId: fileId, ...(role === 'OPERATOR' ? { userId } : {}) },
    select: { attachmentName: true, attachmentMime: true },
  });
  if (leave) return { fileName: leave.attachmentName, mimeType: leave.attachmentMime };

  const exchange = await prisma.shiftExchange.findFirst({
    where: { driveFileId: fileId, ...(role === 'OPERATOR' ? { OR: [{ requesterId: userId }, { targetUserId: userId }] } : {}) },
    select: { attachmentName: true, attachmentMime: true },
  });
  if (exchange) return { fileName: exchange.attachmentName, mimeType: exchange.attachmentMime };

  const program = await prisma.programKerja.findFirst({
    // Authorization server-side: OPERATOR hanya dapat akses evidence program yang berupa PIC-nya.
    where: { driveFileId: fileId, ...(role === 'OPERATOR' ? { picId: userId } : {}) },
    select: { evidenceName: true, evidenceMime: true },
  });
  if (program) return { fileName: program.evidenceName, mimeType: program.evidenceMime };

  const progress = await prisma.programKerjaProgressLog.findFirst({
    where: { driveFileId: fileId },
    select: {
      evidenceName: true,
      evidenceMime: true,
      userId: true,
      program: { select: { picId: true } },
    },
  });
  if (progress) {
    if (role === 'OPERATOR' && progress.userId !== userId && progress.program?.picId !== userId) {
      return null;
    }
    return { fileName: progress.evidenceName, mimeType: progress.evidenceMime };
  }

  const report = await prisma.operationalReport.findFirst({
    where: { driveFileId: fileId, ...(role === 'OPERATOR' ? { uploadedById: userId } : {}) },
    select: { attachmentName: true, attachmentMime: true },
  });
  if (report) return { fileName: report.attachmentName, mimeType: report.attachmentMime };
  return null;
}

function safeFileName(name: string | null) {
  return (name || 'dokumen').replace(/[\\/\r\n"]/g, '_');
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { id } = await params;
  const record = await findAuthorizedFile(id, session.id, session.role);
  if (!record) return NextResponse.json({ error: 'FILE_NOT_FOUND' }, { status: 404 });

  try {
    const file = await getStoredFileContent(id);
    const download = request.nextUrl.searchParams.get('download') === '1';
    return new NextResponse(file.body, {
      headers: {
        'Content-Type': record.mimeType || file.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeFileName(record.fileName)}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FILE_RETRIEVAL_FAILED';
    const status = message === 'FILE_NOT_FOUND' ? 404 : message === 'FILE_ACCESS_DENIED' ? 403 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
