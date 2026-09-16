/**
 * Synchronise Program Kerja 2026 from the official Excel workbook.
 *
 * The workbook is the source of truth for program identity, category, order,
 * notes, and all 12 × 4 Plan/Realisasi periods. Application-only relations
 * (PIC, evidence, tasks, and progress history) are deliberately untouched.
 *
 * Usage:
 *   npm run import:program-kerja -- "C:\\path\\Program kerja Distribusi Gas & ORF 2026.xlsx" --apply
 *
 * Omit --apply to inspect the parsed source without writing to the database.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { PrismaClient, ProgramStatus } from '@prisma/client';
import { parseProgramKerjaWorkbook } from '../src/server/import/excelParser';
import { namesMatch } from '../src/server/import/normalizer';

const prisma = new PrismaClient();
const PERIODS = Array.from({ length: 12 * 4 }, (_, index) => ({
  month: Math.floor(index / 4) + 1,
  week: (index % 4) + 1,
}));

function deriveStatus(
  targetValues: Array<number | null>,
  realizationValues: Array<number | null>
): { status: ProgramStatus; progress: number } {
  const realizations = realizationValues.filter((value): value is number => value !== null);
  if (!realizations.length) return { status: ProgramStatus.PLAN, progress: 0 };

  const plannedIndices = targetValues
    .map((target, idx) => (target !== null ? idx : -1))
    .filter((idx) => idx !== -1);

  const totalPlannedCount = plannedIndices.length || realizations.length;
  const realizedSum = realizationValues.reduce<number>((sum, val) => sum + (val ?? 0), 0);
  const avgProgress = Math.round((realizedSum / (totalPlannedCount * 100)) * 100);
  const boundedProgress = Math.min(100, Math.max(0, avgProgress));

  const hasUnrealizedPlan = plannedIndices.some((idx) => realizationValues[idx] === null);

  if (realizations.every((val) => val === 0)) {
    return { status: ProgramStatus.BELUM_TEREALISASI, progress: 0 };
  }

  if (boundedProgress >= 100 && !hasUnrealizedPlan) {
    return { status: ProgramStatus.REALISASI, progress: 100 };
  }

  if (realizedSum > 0 || realizations.length > 0) {
    return { status: ProgramStatus.ON_PROGRESS, progress: boundedProgress };
  }

  return { status: ProgramStatus.PLAN, progress: 0 };
}

function valueAt(
  values: Array<{ month: number; week: number; value: number }>,
  month: number,
  week: number
): number | null {
  return values.find((period) => period.month === month && period.week === week)?.value ?? null;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const inputPath = args.find((arg) => arg !== '--apply');
  if (!inputPath) {
    throw new Error('Path file Excel wajib diberikan. Gunakan --apply untuk menjalankan sinkronisasi.');
  }

  const filePath = resolve(inputPath);
  const buffer = await readFile(filePath);
  const parsed = parseProgramKerjaWorkbook(buffer);
  if (!parsed.year || !parsed.records.length) {
    throw new Error('Tidak ditemukan data Program Kerja yang valid pada workbook.');
  }
  // A workbook may include a revised second sheet. Parser keeps the last
  // value for a duplicated period; that is an expected revision, not an error.
  const blockingIssues = parsed.issues.filter((issue) => !issue.message.includes('berbeda antar sheet'));
  if (blockingIssues.length) {
    console.warn(`Workbook memiliki ${blockingIssues.length} catatan parse; data tetap tidak ditulis.`);
    for (const issue of blockingIssues.slice(0, 20)) {
      console.warn(`- ${issue.sheet}!${issue.column}${issue.row}: ${issue.message}`);
    }
    throw new Error('Perbaiki catatan parse di atas sebelum menjalankan import.');
  }

  const totalPlan = parsed.records.reduce((total, record) => total + record.planPeriods.length, 0);
  const totalRealisasi = parsed.records.reduce((total, record) => total + record.realisasiPeriods.length, 0);
  console.log(`Sumber: ${basename(filePath)}`);
  console.log(`Tahun ${parsed.year}; ${parsed.records.length} program; ${totalPlan} Plan; ${totalRealisasi} Realisasi.`);
  console.log(`Sheet: ${parsed.sheets.join(', ')}`);
  if (!apply) {
    console.log('Preview selesai. Tidak ada data database yang diubah. Tambahkan --apply untuk menyelaraskan data.');
    return;
  }

  const existing = await prisma.programKerja.findMany({
    where: { year: parsed.year },
    select: { id: true, category: true, name: true },
  });
  let created = 0;
  let updated = 0;

  console.log('Menyelaraskan metadata program dan 48 periode per program...');
  for (const [recordIndex, record] of parsed.records.entries()) {
    const matching = existing.find(
      (program) => program.category === record.category && namesMatch(program.name, record.name)
    );
    const targetValues = PERIODS.map(({ month, week }) => valueAt(record.planPeriods, month, week));
    const realizationValues = PERIODS.map(({ month, week }) => valueAt(record.realisasiPeriods, month, week));
    const { status, progress } = deriveStatus(targetValues, realizationValues);
    const months = PERIODS.map(({ month, week }, index) => ({
      month,
      week,
      target: targetValues[index],
      realization: realizationValues[index],
    }));

    const data = {
      sequence: record.sequence,
      name: record.name,
      notes: record.notes,
      planTarget: 100,
      progress,
      status,
    };
    if (matching) {
      // Prisma may execute nested createMany before nested deleteMany. Delete
      // source-only period rows first so their unique (program, month, week)
      // key can be recreated exactly from the workbook.
      await prisma.programKerjaMonth.deleteMany({ where: { programId: matching.id } });
      await prisma.programKerja.update({
        where: { id: matching.id },
        data: {
          ...data,
          // Program identity stays the same, so PIC/evidence/tasks/history are
          // preserved. Its 48 source-only monthly values are replaced exactly.
          months: { createMany: { data: months } },
        },
      });
      matching.name = record.name;
    } else {
      const createdProgram = await prisma.programKerja.create({
        data: {
          year: parsed.year,
          category: record.category,
          ...data,
          months: { createMany: { data: months } },
        },
      });
      // The workbook can contain the same program in its revised sheet. Keep
      // this run's lookup list current so the next row updates it, not creates
      // a duplicate against the database unique key.
      existing.push({ id: createdProgram.id, category: record.category, name: record.name });
    }
    if (matching) updated += 1;
    else created += 1;
    if ((recordIndex + 1) % 10 === 0 || recordIndex + 1 === parsed.records.length) {
      console.log(`- ${recordIndex + 1}/${parsed.records.length} program tersinkron.`);
    }
  }

  await prisma.dataImport.create({
    data: {
      fileName: basename(filePath),
      fileHash: createHash('sha256').update(buffer).digest('hex'),
      fileSize: buffer.byteLength,
      status: 'SUCCESS',
      sheetNames: parsed.sheets,
      year: parsed.year,
      totalRecords: parsed.records.length,
      planRecords: totalPlan,
      realizationRecords: totalRealisasi,
      notesRecords: parsed.records.filter((record) => Boolean(record.notes)).length,
      createdCount: created,
      updatedCount: updated,
      summary: {
        sourceOfTruth: 'Excel',
        preservedRelations: ['pic', 'evidence', 'tasks', 'progressLogs'],
        synchronizedPeriods: 48,
      },
    },
  });

  console.log(`Sinkronisasi selesai: ${created} program baru, ${updated} program diperbarui.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
