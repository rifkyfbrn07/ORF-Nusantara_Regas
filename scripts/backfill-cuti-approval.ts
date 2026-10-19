/**
 * Backfill konfigurasi approval cuti (idempotent, NON-destructive):
 *   1. User.team diisi dari Schedule.notes roster ("Roster ORF | Team B | Field").
 *   2. User.joinedDate diisi default 2025-09-01 bila belum ada.
 *   3. TeamConfig (A/B/C) di-upsert: reviewerId + teamLeadId (+ managerId fallback).
 *
 * Pemetaan (berdasarkan roster resmi ORF — lihat prisma/regasDataRoster.ts):
 *   - Team A: Reviewer = Itqi Arradi, Team Lead = M. T Ibrahim (Supervisor/Lead Operator).
 *   - Team B: Reviewer = Qoni Fahman, Team Lead = Manager (belum ada Supervisor di roster B).
 *   - Team C: Reviewer = Erwin Maulana, Team Lead = Manager (belum ada Supervisor di roster C).
 *
 * Catatan: Tim B & C belum memiliki Supervisor/Lead Operator eksplisit pada roster 2026.
 *   Untuk sementara Team Lead mereka diarahkan ke user MANAGER aktif. Admin disarankan
 *   menetapkan Team Lead khusus per tim lewat konfigurasi TeamConfig bila sudah tersedia.
 *
 * Jalankan: npx tsx scripts/backfill-cuti-approval.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TEAM_CONFIGS: Array<{ code: string; name: string; reviewerName: string; teamLeadName: string | null }> = [
  { code: 'A', name: 'Team A', reviewerName: 'Itqi Arradi', teamLeadName: 'M. T Ibrahim' },
  { code: 'B', name: 'Team B', reviewerName: 'Qoni Fahman', teamLeadName: null },
  { code: 'C', name: 'Team C', reviewerName: 'Erwin Maulana', teamLeadName: null },
];

async function main() {
  // 1. Backfill User.team dari Schedule.notes + joinedDate default
  const users = await prisma.user.findMany({
    select: { id: true, name: true, team: true, joinedDate: true },
  });
  let teamAssigned = 0;
  let joinedAssigned = 0;
  for (const u of users) {
    const data: { team?: string; joinedDate?: string } = {};
    if (!u.team) {
      const sched = await prisma.schedule.findFirst({
        where: { userId: u.id, notes: { contains: 'Team ' } },
        orderBy: { date: 'desc' },
        select: { notes: true },
      });
      const m = sched?.notes?.match(/Team\s+([ABC])/i);
      if (m) {
        data.team = m[1].toUpperCase();
        teamAssigned++;
      }
    }
    if (!u.joinedDate) {
      data.joinedDate = '2025-09-01';
      joinedAssigned++;
    }
    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: u.id }, data });
    }
  }
  console.log(`Backfill User: team=${teamAssigned} assigned, joinedDate=${joinedAssigned} assigned`);

  // 2. Resolve nama -> user
  const resolveByName = async (name: string) => {
    const u = await prisma.user.findFirst({ where: { name }, select: { id: true } });
    return u?.id ?? null;
  };
  const manager = await prisma.user.findFirst({ where: { role: 'MANAGER', isActive: true }, select: { id: true } });

  // 3. Upsert TeamConfig
  for (const cfg of TEAM_CONFIGS) {
    const reviewerId = await resolveByName(cfg.reviewerName);
    const teamLeadId = cfg.teamLeadName ? await resolveByName(cfg.teamLeadName) : manager?.id ?? null;
    const row = await prisma.teamConfig.upsert({
      where: { code: cfg.code },
      update: {
        name: cfg.name,
        reviewerId,
        teamLeadId,
        managerId: manager?.id ?? null,
      },
      create: {
        code: cfg.code,
        name: cfg.name,
        reviewerId,
        teamLeadId,
        managerId: manager?.id ?? null,
      },
    });
    console.log(
      `TeamConfig ${cfg.code}: reviewer=${cfg.reviewerName}(${reviewerId ? 'OK' : 'NOT FOUND'}) teamLead=${teamLeadId ? 'OK' : 'NULL'}`
    );
  }

  const configs = await prisma.teamConfig.findMany();
  console.log('TeamConfig rows:', configs.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
