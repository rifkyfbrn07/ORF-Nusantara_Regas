import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getEvidenceStream } from '@/server/services/vercelBlobService';

type FileRecord = {
  fileName: string | null;
  mimeType: string | null;
  storageProvider: string | null;
  storagePath: string | null;
  driveFileId: string | null;
};

function toFileRecord(name: string | null, mime: string | null, extra: Pick<FileRecord, 'storageProvider' | 'storagePath' | 'driveFileId'>): FileRecord {
  return { fileName: name, mimeType: mime, ...extra };
}

async function findAuthorizedFile(fileId: string, userId: string, role: string): Promise<FileRecord | null> {
  const fileOrPath: Record<string, string>[] = [{ driveFileId: fileId }, { storagePath: fileId }];

  const leave = await prisma.leaveRequest.findFirst({
    where: { OR: fileOrPath, ...(role === 'OPERATOR' ? { userId } : {}) },
    select: { attachmentName: true, attachmentMime: true, storageProvider: true, storagePath: true, driveFileId: true },
  });
  if (leave) return toFileRecord(leave.attachmentName, leave.attachmentMime, leave);

  const exchange = await prisma.shiftExchange.findFirst({
    where: {
      AND: [
        { OR: fileOrPath },
        ...(role === 'OPERATOR' ? [{ OR: [{ requesterId: userId }, { targetUserId: userId }] }] : []),
      ],
    },
    select: { attachmentName: true, attachmentMime: true, storageProvider: true, storagePath: true, driveFileId: true },
  });
  if (exchange) return toFileRecord(exchange.attachmentName, exchange.attachmentMime, exchange);

  const program = await prisma.programKerja.findFirst({
    where: { OR: fileOrPath, ...(role === 'OPERATOR' ? { picId: userId } : {}) },
    select: { evidenceName: true, evidenceMime: true, storageProvider: true, storagePath: true, driveFileId: true },
  });
  if (program) return toFileRecord(program.evidenceName, program.evidenceMime, program);

  const progress = await prisma.programKerjaProgressLog.findFirst({
    where: { OR: fileOrPath },
    select: {
      evidenceName: true,
      evidenceMime: true,
      storageProvider: true,
      storagePath: true,
      driveFileId: true,
      userId: true,
      program: { select: { picId: true } },
    },
  });
  if (progress) {
    if (role === 'OPERATOR' && progress.userId !== userId && progress.program?.picId !== userId) {
      return null;
    }
    return toFileRecord(progress.evidenceName, progress.evidenceMime, progress);
  }

  const report = await prisma.operationalReport.findFirst({
    where: { OR: fileOrPath, ...(role === 'OPERATOR' ? { uploadedById: userId } : {}) },
    select: { attachmentName: true, attachmentMime: true, storageProvider: true, storagePath: true, driveFileId: true },
  });
  if (report) return toFileRecord(report.attachmentName, report.attachmentMime, report);
  return null;
}

function safeFileName(name: string | null) {
  return (name || 'dokumen').replace(/[\\/\r\n"]/g, '_');
}

function buildResponseHeaders(fileName: string | null, mimeType: string | null, contentType: string, download: boolean) {
  return {
    'Content-Type': mimeType || contentType || 'application/octet-stream',
    'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeFileName(fileName)}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string[] }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const segments = (await params).id;
  const id = segments.map((s) => decodeURIComponent(s)).join('/');

  const record = await findAuthorizedFile(id, session.id, session.role);
  if (!record) return NextResponse.json({ error: 'FILE_NOT_FOUND' }, { status: 404 });

  const download = request.nextUrl.searchParams.get('download') === '1';

  try {
    // Storage baru: Vercel Blob (private). Token tidak pernah ke browser.
    const blobPath = record.storageProvider === 'vercel_blob' ? record.storagePath : null;
    if (blobPath) {
      const blob = await getEvidenceStream(blobPath);
      return new NextResponse(blob.stream, {
        headers: buildResponseHeaders(record.fileName, record.mimeType, blob.blob.contentType ?? '', download),
      });
    }

    // Historical records: masih memakai Google Drive (jika Drive masih dikonfigurasi).
    const driveId = record.driveFileId;
    if (driveId) {
      const { isGoogleDriveConfigured, getStoredFileContent } = await import('@/server/services/googleDriveService');
      if (isGoogleDriveConfigured()) {
        const file = await getStoredFileContent(driveId);
        return new NextResponse(file.body, {
          headers: buildResponseHeaders(record.fileName, record.mimeType, file.headers.get('content-type') || '', download),
        });
      }
    }

    return NextResponse.json({ error: 'FILE_NOT_FOUND' }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FILE_RETRIEVAL_FAILED';
    const status = message === 'FILE_NOT_FOUND' ? 404 : message === 'FILE_ACCESS_DENIED' ? 403 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}