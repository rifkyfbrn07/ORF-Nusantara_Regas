/**
 * ============================================================================
 * SEED REGAS — Program Kerja 2026 & Jadwal Operator ORF Muara Karang
 * ============================================================================
 * IDEMPOTENT: semua operasi menggunakan upsert pada unique key yang tepat,
 * sehingga seed dapat dijalankan berulang tanpa membuat data duplikat dan
 * TANPA menghapus data existing lainnya (tidak ada deleteMany).
 *
 * Sumber data: prisma/regasDataProgram.ts & prisma/regasDataRoster.ts
 * (diekstrak dari dokumen PDF resmi — lihat komentar di file tersebut).
 *
 * Jalankan: npm run seed:regas
 * ============================================================================
 */
import { PrismaClient, Role, ScheduleStatus, ProgramCategory, ProgramStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PROGRAM_KERJA_2026 } from './regasDataProgram';
import { ROSTER_ORF_MUARA_KARANG, ORF_SHIFTS, RosterOperatorSeed } from './regasDataRoster';
import { ensureUsernames, slugifyUsername } from './usernameBackfill';

const prisma = new PrismaClient();

const ROSTER_PASSWORD = process.env.ROSTER_OPERATOR_PASSWORD || 'Operator123!';

function slugifyEmail(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 40);
  return `${slug}@fieldops.local`;
}

/** Metadata roster disimpan terstruktur pada Schedule.notes agar tidak butuh model baru. */
function buildRosterNotes(op: Pick<RosterOperatorSeed, 'team' | 'positionSuffix' | 'hsseMarshall'>): string {
  const segments = ['Roster ORF', `Team ${op.team}`];
  if (op.positionSuffix) segments.push(op.positionSuffix);
  if (op.hsseMarshall) segments.push('HSSE Marshall');
  return segments.join(' | ');
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

// ============================================================================
// 1. SHIFT REUSABLE (PAGI / MALAM / OFF)
// ============================================================================
async function seedShifts(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const shift of ORF_SHIFTS) {
    const row = await prisma.shift.upsert({
      where: { code: shift.code },
      update: {
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        durationHours: shift.durationHours,
        requiredCount: shift.requiredCount,
        description: shift.description,
        isActive: true,
      },
      create: {
        code: shift.code,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        durationHours: shift.durationHours,
        requiredCount: shift.requiredCount,
        description: shift.description,
        isActive: true,
      },
    });
    map.set(shift.code, row.id);
  }
  console.log('✓ Shifts (ORF_PAGI / ORF_MALAM / ORF_OFF) upserted');
  return map;
}

// ============================================================================
// 2. OPERATOR ROSTER (USER) — dibuat jika belum ada, tidak menimpa akun existing
// ============================================================================
async function seedRosterOperators(): Promise<Map<string, { id: string; name: string }>> {
  const dept = await prisma.department.upsert({
    where: { code: 'OPS' },
    update: {},
    create: {
      name: 'Operations & Production',
      code: 'OPS',
      description: 'Operasional Lapangan, Control Room, Gas Metering, & Scada Systems',
    },
  });

  const passwordHash = await bcrypt.hash(ROSTER_PASSWORD, 12);
  const users = new Map<string, { id: string; name: string }>();
  let employeeSeq = 1;

  for (const monthRoster of ROSTER_ORF_MUARA_KARANG) {
    for (const op of monthRoster.operators) {
      const email = slugifyEmail(op.name);
      const position = op.positionSuffix
        ? op.positionSuffix === 'Supervisor/Lead Operator'
          ? 'Supervisor/Lead Operator'
          : `Operator ${op.positionSuffix}`
        : 'Operator';
      const employeeId = `ORF-OP-${pad2(employeeSeq)}`;
      const username = slugifyUsername(op.name);

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          position,
          phone: op.phone,
          isActive: true,
          departmentId: dept.id,
          username,
        },
        create: {
          email,
          name: op.name,
          employeeId,
          username,
          passwordHash,
          role: Role.OPERATOR,
          position,
          phone: op.phone,
          isActive: true,
          departmentId: dept.id,
        },
      });
      employeeSeq += 1;
      users.set(`${monthRoster.year}-${pad2(monthRoster.month)}|${op.name}`, {
        id: user.id,
        name: user.name,
      });
    }
  }
  console.log(
    `✓ Operator roster upserted (${ROSTER_ORF_MUARA_KARANG.reduce((a, m) => a + m.operators.length, 0)} baris roster, password default: ${ROSTER_PASSWORD})`
  );
  return users;
}

// ============================================================================
// 3. SCHEDULE — integrasi penuh dengan model Schedule/Shift/Location existing
// ============================================================================
async function seedRosterSchedules(
  shiftMap: Map<string, string>,
  userMap: Map<string, { id: string; name: string }>
): Promise<void> {
  const location = await prisma.location.upsert({
    where: { code: 'ORF-MKG' },
    update: {},
    create: {
      name: 'ORF Muara Karang',
      code: 'ORF-MKG',
      address: 'Onshore Receiving Facility Muara Karang, Jl. Pluit Karang Ayu, Pluit, Penjaringan, Jakarta Utara',
    },
  });

  const shiftPagi = shiftMap.get('ORF_PAGI')!;
  const shiftMalam = shiftMap.get('ORF_MALAM')!;
  const shiftOff = shiftMap.get('ORF_OFF')!;

  let count = 0;
  for (const monthRoster of ROSTER_ORF_MUARA_KARANG) {
    const daysInMonth = new Date(monthRoster.year, monthRoster.month, 0).getDate();
    for (const op of monthRoster.operators) {
      const user = userMap.get(`${monthRoster.year}-${pad2(monthRoster.month)}|${op.name}`);
      if (!user) throw new Error(`User roster tidak ditemukan: ${op.name}`);
      if (op.shifts.length !== daysInMonth) {
        throw new Error(`Jumlah shift ${op.name} (${op.shifts.length}) != jumlah hari ${daysInMonth}`);
      }
      const notes = buildRosterNotes(op);

      const jobs = op.shifts.map((shiftCode, idx) => {
        const date = `${monthRoster.year}-${pad2(monthRoster.month)}-${pad2(idx + 1)}`;
        const isOff = shiftCode === 'Off';
        const shiftId = isOff ? shiftOff : shiftCode === 'Pg' ? shiftPagi : shiftMalam;
        return prisma.schedule.upsert({
          where: { userId_date: { userId: user.id, date } },
          update: {
            shiftId,
            locationId: location.id,
            status: isOff ? ScheduleStatus.OFF : ScheduleStatus.WORK,
            notes,
          },
          create: {
            userId: user.id,
            date,
            shiftId,
            locationId: location.id,
            status: isOff ? ScheduleStatus.OFF : ScheduleStatus.WORK,
            notes,
          },
        });
      });

      // Batch agar efisien terhadap database remote
      const CHUNK = 40;
      for (let i = 0; i < jobs.length; i += CHUNK) {
        await Promise.all(jobs.slice(i, i + CHUNK));
      }
      count += jobs.length;
    }
  }
  console.log(`✓ Schedules upserted (${count} baris, lokasi: ${location.name})`);
}

// ============================================================================
// 4. PROGRAM KERJA 2026
// ============================================================================
function deriveProgramStatus(entries: { realization: number }[]): {
  status: ProgramStatus;
  progress: number;
} {
  if (entries.length === 0) {
    return { status: ProgramStatus.PLAN, progress: 0 };
  }
  const avg = Math.round(entries.reduce((a, e) => a + e.realization, 0) / entries.length);
  if (avg >= 100) return { status: ProgramStatus.REALISASI, progress: 100 };
  if (avg > 0) return { status: ProgramStatus.ON_PROGRESS, progress: avg };
  return { status: ProgramStatus.BELUM_TEREALISASI, progress: 0 };
}

async function seedProgramKerja(): Promise<void> {
  const year = 2026;
  for (const program of PROGRAM_KERJA_2026) {
    const { status, progress } = deriveProgramStatus(program.entries);
    const row = await prisma.programKerja.upsert({
      where: {
        year_category_name: {
          year,
          category: program.category as ProgramCategory,
          name: program.name,
        },
      },
      update: {
        sequence: program.sequence,
        plan: program.plan ?? null,
        realization: program.realization ?? null,
        notes: program.notes ?? null,
        status,
        progress,
        planTarget: 100,
      },
      create: {
        year,
        category: program.category as ProgramCategory,
        sequence: program.sequence,
        name: program.name,
        plan: program.plan ?? null,
        realization: program.realization ?? null,
        planTarget: 100,
        progress,
        status,
        notes: program.notes ?? null,
      },
    });

    for (const entry of program.entries) {
      await prisma.programKerjaMonth.upsert({
        where: {
          programId_month_week: {
            programId: row.id,
            month: entry.month,
            week: entry.week,
          },
        },
        update: { realization: entry.realization, target: 100 },
        create: {
          programId: row.id,
          month: entry.month,
          week: entry.week,
          target: 100,
          realization: entry.realization,
        },
      });
    }
  }
  console.log(
    `✓ Program Kerja ${year} upserted (${PROGRAM_KERJA_2026.length} program + realisasi mingguan Jan-Des)`
  );
}

// ============================================================================
async function main() {
  console.log('--- Starting REGAS Seed (Program Kerja 2026 + Jadwal Operator ORF) ---');
  const shiftMap = await seedShifts();
  const userMap = await seedRosterOperators();
  await seedRosterSchedules(shiftMap, userMap);
  await seedProgramKerja();
  const backfilled = await ensureUsernames(prisma);
  console.log(`✓ Username backfill: ${backfilled} user diperbarui`);
  console.log('----------------------------------------------------');
  console.log('✓ REGAS Seed selesai (idempotent — aman dijalankan ulang).');
  console.log(`  Akun operator roster memakai password default: ${ROSTER_PASSWORD}`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during REGAS seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
