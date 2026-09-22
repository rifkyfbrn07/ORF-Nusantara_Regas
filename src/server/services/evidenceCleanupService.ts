import { list, del } from '@vercel/blob';
import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { recordAuditLog } from './auditService';
import { isStorageConfigured } from './vercelBlobService';

export const CLEANUP_STATUS_CLEANED = 'CLEANED';
export const CLEANUP_STATUS_FAILED = 'FAILED';
export const CLEANUP_STATUS_PENDING_RETRY = 'PENDING_RETRY';

export interface EvidenceScanResult {
  totalActive: number;
  totalOrphan: number;
  rejectedLeftover: number;
  failedCleanup: number;
  orphanFiles: string[];
}

export interface EvidenceCleanupResult {
  scanned: number;
  deleted: number;
  failed: number;
  failedFiles: string[];
  summary: string;
}

/** Lijst alle blob-pathnames onder `evidence/` in de store. */
async function listAllBlobEvidencePaths(): Promise<string[]> {
  const paths: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: 'evidence/', cursor, limit: 1000 });
    for (const b of page.blobs ?? []) paths.push(b.pathname);
    cursor = page.cursor;
    if (!page.hasMore) cursor = undefined;
  } while (cursor);
  return paths;
}

/** Verzamel alle storagePath die nog door een DB-record gerefereerd worden (blob-only). */
async function collectActiveEvidencePaths(): Promise<Set<string>> {
  const paths = new Set<string>();
  const [leaves, exchanges, reports, programs, progressLogs] = await Promise.all([
    prisma.leaveRequest.findMany({ where: { storagePath: { not: null } }, select: { storagePath: true } }),
    prisma.shiftExchange.findMany({ where: { storagePath: { not: null } }, select: { storagePath: true } }),
    prisma.operationalReport.findMany({ where: { storagePath: { not: null } }, select: { storagePath: true } }),
    prisma.programKerja.findMany({ where: { storagePath: { not: null } }, select: { storagePath: true } }),
    prisma.programKerjaProgressLog.findMany({ where: { storagePath: { not: null } }, select: { storagePath: true } }),
  ]);
  for (const r of [...leaves, ...exchanges, ...reports, ...programs, ...progressLogs]) {
    if (r.storagePath) paths.add(r.storagePath as string);
  }
  return paths;
}
export async function scanEvidenceStorage(): Promise<EvidenceScanResult> {
  if (!isStorageConfigured()) {
    throw new Error('Storage evidence belum dikonfigurasi di server.');
  }
  const blobPaths = await listAllBlobEvidencePaths();
  const active = await collectActiveEvidencePaths();
  const orphanFiles = blobPaths.filter((p) => !active.has(p));

  const rejectedLeftover = await prisma.$queryRaw<{ cnt: bigint }[]>(
    Prisma.sql`SELECT (SELECT COUNT(*) FROM "LeaveRequest" WHERE "storagePath" IS NOT NULL AND "status" = 'REJECTED') +
            (SELECT COUNT(*) FROM "ShiftExchange" WHERE "storagePath" IS NOT NULL AND "status" = 'REJECTED') AS cnt`
  );
  const failedCleanup = await prisma.$queryRaw<{ cnt: bigint }[]>(
    Prisma.sql`SELECT (SELECT COUNT(*) FROM "LeaveRequest" WHERE "storagePath" IS NOT NULL AND "evidenceCleanupStatus" = 'FAILED') +
            (SELECT COUNT(*) FROM "ShiftExchange" WHERE "storagePath" IS NOT NULL AND "evidenceCleanupStatus" IN ('FAILED','PENDING_RETRY')) AS cnt`
  );

  return {
    totalActive: active.size,
    totalOrphan: orphanFiles.length,
    rejectedLeftover: Number(rejectedLeftover[0]?.cnt || 0),
    failedCleanup: Number(failedCleanup[0]?.cnt || 0),
    orphanFiles,
  };
}

/**
 * CLEANUP: verwijder ALLEEN bewezen orphan blobs (geen DB-referentie).
 * Veilig: gebruikt de actieve-set van dit moment; vreemde/bekende files worden
 * nooit verwijderd. Logt "Evidence cleanup: X active files, Y orphan files,
 * Z deleted, N failed".
 */
export async function runEvidenceCleanup(actorId?: string): Promise<EvidenceCleanupResult> {
  if (!isStorageConfigured()) {
    throw new Error('Storage evidence belum dikonfigurasi di server.');
  }
  const blobPaths = await listAllBlobEvidencePaths();
  const active = await collectActiveEvidencePaths();
  const orphans = blobPaths.filter((p) => !active.has(p));

  let deleted = 0;
  let failed = 0;
  const failedFiles: string[] = [];

  for (const path of orphans) {
    try {
      await del(path);
      deleted += 1;
    } catch {
      failed += 1;
      failedFiles.push(path);
    }
  }

  const summary = `Evidence cleanup: ${active.size} active files, ${orphans.length} orphan files, ${deleted} deleted, ${failed} failed.`;
  console.log(`[EvidenceCleanup] ${summary}`);

  await recordAuditLog({
    userId: actorId,
    action: 'EVIDENCE_CLEANUP_EXECUTED',
    entity: 'Storage',
    metadata: {
      activeFiles: active.size,
      orphanFiles: orphans.length,
      deleted,
      failed,
      failedFiles,
    },
  });

  return { scanned: blobPaths.length, deleted, failed, failedFiles, summary };
}
/**
 * REJECTED REQUEST → evidence verwijderen (veilige volgorde):
 * 1. status request is AL al REJECTED (door caller), 2. verwijder Blob file,
 * 3. schoon metadata op, 4. audit. Record request BLIJFT (histori/audit).
 * Bij Blob-fout: cleanupStatus = FAILED (zodat retry mogelijk is), nooit crash.
 */
export async function deleteEvidenceForRejectedRecord(
  kind: 'LeaveRequest' | 'ShiftExchange',
  id: string,
  actorId?: string
): Promise<{ ok: boolean; deletedPath?: string | null; error?: string }> {
  const select = { storageProvider: true, storagePath: true, driveFileId: true, attachmentUrl: true };
  const row = kind === 'LeaveRequest'
    ? await prisma.leaveRequest.findUnique({ where: { id }, select })
    : await prisma.shiftExchange.findUnique({ where: { id }, select });
  if (!row) return { ok: false, error: 'NOT_FOUND' };

  const isBlob = row.storageProvider === 'vercel_blob' && Boolean(row.storagePath);
  const cleanupData = {
    storagePath: null,
    storageProvider: null,
    driveFileId: null,
    driveWebViewLink: null,
    attachmentUrl: null,
    attachmentName: null,
    attachmentMime: null,
    attachmentSize: null,
    evidenceCleanupStatus: CLEANUP_STATUS_CLEANED,
    evidenceCleanupAt: new Date(),
  };

  if (isBlob) {
    try {
      await del(row.storagePath as string);
    } catch (error) {
      const failedData = { evidenceCleanupStatus: CLEANUP_STATUS_FAILED, evidenceCleanupAt: new Date() };
      if (kind === 'LeaveRequest') {
        await prisma.leaveRequest.update({ where: { id }, data: failedData });
      } else {
        await prisma.shiftExchange.update({ where: { id }, data: failedData });
      }
      const errMsg = error instanceof Error ? error.message : 'Blob delete fail';
      await recordAuditLog({
        userId: actorId,
        action: 'EVIDENCE_CLEANUP_FAILED',
        entity: kind,
        entityId: id,
        metadata: { storagePath: row.storagePath, cleanupStatus: CLEANUP_STATUS_FAILED, error: errMsg },
      });
      return { ok: false, error: errMsg };
    }
  }

  if (kind === 'LeaveRequest') {
    await prisma.leaveRequest.update({ where: { id }, data: cleanupData });
  } else {
    await prisma.shiftExchange.update({ where: { id }, data: cleanupData });
  }

  await recordAuditLog({
    userId: actorId,
    action: 'EVIDENCE_DELETED_FOR_REJECTED_REQUEST',
    entity: kind,
    entityId: id,
    metadata: {
      storagePath: isBlob ? row.storagePath : null,
      cleanupStatus: CLEANUP_STATUS_CLEANED,
      legacyNote: isBlob ? undefined : 'legacy non-blob reference cleared',
    },
  });

  return { ok: true, deletedPath: isBlob ? row.storagePath : null };
}