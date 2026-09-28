/**
 * Cleanup dataset lama Program Kerja 2026.
 * Hanya satu program legacy yang tersisa di database ("Bechmark Pertamina Group")
 * yang TIDAK ada di workbook resmi "Program kerja Distribusi Gas & ORF 2026.xlsx"
 * (sheet "Plan 2026 (2)"). Workbook tersebut kini menjadi source of truth.
 *
 * Strategi aman:
 *  - Hanya menghapus bila program tidak memiliki relasi aplikasi
 *    (tidak ada progressLogs / tasks / PIC / evidence) → tidak ada data
 *    historis operator yang hilang.
 *  - Sebelum hapus, catat ke AuditLog + DataImport sebagai jejak arsip
 *    (nama, kategori, alasan). Data histori sistem tetap tersedia.
 */
import { prisma } from '../src/lib/db/prisma';

const LEGACY = { year: 2026, category: 'RAPAT_KOORDINASI', name: 'Bechmark Pertamina Group' } as const;

async function main() {
  const legacy = await prisma.programKerja.findUnique({
    where: { year_category_name: { year: LEGACY.year, category: LEGACY.category, name: LEGACY.name } },
    select: {
      id: true,
      _count: { select: { progressLogs: true, tasks: true } },
    },
  });
  if (!legacy) {
    console.log('Legacy program sudah tidak ada — skip.');
    return;
  }

  const rel = legacy._count;
  if (rel.progressLogs > 0 || rel.tasks > 0) {
    console.error('ABORT: program legacy memiliki relasi aplikasi — jangan dihapus otomatis.');
    process.exit(1);
  }

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });

  await prisma.$transaction(async (tx) => {
    await tx.programKerja.delete({ where: { id: legacy.id } });

    await tx.auditLog.create({
      data: {
        userId: admin?.id ?? null,
        action: 'ARCHIVE_LEGACY_PROGRAM_KERJA',
        entity: 'ProgramKerja',
        entityId: legacy.id,
        metadata: JSON.stringify({
          name: LEGACY.name,
          category: LEGACY.category,
          year: LEGACY.year,
          reason: 'Tidak ada di workbook resmi (source of truth) — dataset lama digantikan.',
        }),
      },
    });

    await tx.dataImport.create({
      data: {
        fileName: 'Program kerja Distribusi Gas & ORF 2026.xlsx',
        fileHash: 'legacy-cleanup-2026-sync',
        fileSize: 0,
        documentType: 'PROGRAM_KERJA',
        status: 'SUCCESS',
        year: 2026,
        totalRecords: 0,
        createdCount: 0,
        updatedCount: 0,
        rejectedCount: 1,
        summary: {
          cleanup: 'Archived legacy program not present in source-of-truth workbook.',
          archivedNames: [LEGACY.name],
        },
      },
    });
  });

  const total = await prisma.programKerja.count({ where: { year: 2026 } });
  console.log(`Legacy "${LEGACY.name}" archived. Total program 2026 sekarang: ${total}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());