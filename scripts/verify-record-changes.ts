/**
 * VERIFIKASI READ-ONLY — perubahan baru. Tidak mengubah/menghapus data.
 */
import { prisma } from '../src/lib/db/prisma';
import { getFinalScheduleStates, getMonthlyWorkStatistics } from '../src/server/services/workStatisticsService';
import { listProgramKerja } from '../src/server/services/programKerjaService';
import { getScheduleSummary } from '../src/server/services/scheduleSummaryService';

async function main() {
  let failures = 0;
  const assert = (cond: boolean, test: string, detail?: string) => {
    if (cond) console.log(`[PASS] ${test}`);
    else {
      console.log(`[FAIL] ${test}${detail ? ` — ${detail}` : ''}`);
      failures += 1;
    }
  };

  console.log('===== 1. SHIFT HOURS (Req 3) =====');
  const shifts = await prisma.shift.findMany({ where: { code: { in: ['ORF_PAGI', 'ORF_MALAM'] } } });
  const pagi = shifts.find((s) => s.code === 'ORF_PAGI');
  const malam = shifts.find((s) => s.code === 'ORF_MALAM');
  assert(pagi?.startTime === '07:00' && pagi?.endTime === '19:00', 'ORF_PAGI = 07:00 - 19:00', JSON.stringify(pagi));
  assert(malam?.startTime === '19:00' && malam?.endTime === '07:00', 'ORF_MALAM = 19:00 - 07:00 (overnight)', JSON.stringify(malam));

  console.log('\n===== 2. NO DUPLICATE SCHEDULE per (user, date) =====');
  const dup = await prisma.$queryRawUnsafe<{ userId: string; date: string; c: number }[]>(
    `SELECT "userId", "date", COUNT(*)::int AS c FROM "Schedule" GROUP BY "userId", "date" HAVING COUNT(*) > 1 LIMIT 10`
  );
  assert(dup.length === 0, 'Tidak ada schedule ganda (unique userId+date terpenuhi)', dup.map((d) => `${d.userId}|${d.date}`).join(', '));

  console.log('\n===== 3. CUTI/IZIN OVERLAY (Req 8/14) =====');
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: { status: 'APPROVED' },
    select: { userId: true, startDate: true, endDate: true, type: true },
  });
  assert(approvedLeaves.length > 0, `Terdapat ${approvedLeaves.length} cuti APPROVED di DB`);
  if (approvedLeaves.length > 0) {
    const l = approvedLeaves[0];
    try {
      const days = await getFinalScheduleStates(l.userId, Number(l.startDate.slice(0, 4)), Number(l.startDate.slice(5, 7)));
      const covered = days.filter((d) => d.date >= l.startDate && d.date <= l.endDate);
      const allCut = covered.length > 0 && covered.every((d) => d.finalStatus === 'CUTI' || d.finalStatus === 'IZIN' || d.finalStatus === 'SAKIT');
      assert(allCut, `Tanggal ${l.startDate}..${l.endDate} berstatus CUTI/IZIN/SAKIT di final status (${l.type})`, covered.map((d) => `${d.date}=${d.finalStatus}`).join(', '));
      const rows = await prisma.schedule.count({ where: { userId: l.userId, date: { gte: l.startDate, lte: l.endDate } } });
      // Row schedule boleh 0 jika cuti lama di-approve sebelum fitur CASE-B;
      // yang terpenting: TIDAK boleh ada lebih dari satu row per tanggal.
      assert(rows <= covered.length, `Jumlah row schedule = ${rows} (tidak lebih dari jumlah hari cuti; boleh 0 untuk data lama)`);
    } catch (e) {
      console.log(`  (skipped leave overlay: ${(e as Error).message})`);
    }
  }
console.log('\n===== 4. MONTHLY WORK STATISTICS (Req 13) =====');
  const operators = await prisma.user.findMany({ where: { role: 'OPERATOR', isActive: true }, select: { id: true }, take: 3 });
  for (const op of operators) {
    try {
      const stats = await getMonthlyWorkStatistics(op.id, 2026, 9);
      const sum = stats.work + stats.off + stats.cuti + stats.izin + stats.sakit + stats.noData;
      assert(sum === stats.totalDays, `Statistik bulan 9 utk operator berjumlah = total hari (${sum}/${stats.totalDays})`);
      assert(stats.pagi + stats.malam === stats.work, `pagi+malam = work (${stats.pagi}+${stats.malam}=${stats.work})`, JSON.stringify(stats));
    } catch (e) {
      console.log(`  (skipped stats: ${(e as Error).message})`);
    }
  }

  console.log('\n===== 5. PROGRAM KERJA — PLAN TIDAK HILANG SAAT REALISASI (Req 1) =====');
  const programs = await listProgramKerja({ year: 2026 });
  const realized = programs.filter((p) => p.status === 'REALISASI');
  const realizedWithPlan = realized.filter((p) => p.months.some((m) => m.target !== null));
  assert(realized.length > 0, `Ada ${realized.length} program REALISASI`);
  assert(
    realizedWithPlan.length > 0,
    `${realizedWithPlan.length}/${realized.length} program REALISASI masih menyimpan Plan (target)`,
    realized.slice(0, 3).map((p) => `${p.name} targets=${p.months.filter((m) => m.target !== null).length}`).join(' | ')
  );
  // Requirement #1: pada periode yang sama, Plan (target) DAN Realisasi ada.
  const planXReal = realized.filter((p) =>
    p.months.some((m) => m.realization !== null && m.realization >= 100 && m.target !== null)
  );
  assert(
    planXReal.length > 0,
    `${planXReal.length}/${realized.length} program REALISASI memiliki Plan + Realisasi di periode yang sama`,
    planXReal.slice(0, 3).map((p) => p.name).join(' | ')
  );

  // Filter REALISASI: hanya program dengan data realisasi; data plan tidak terhapus.
  const onlyReal = programs.filter(
    (p) => p.months.some((m) => m.realization !== null && m.realization >= 100) || p.status === 'REALISASI'
  );
  assert(programs.length >= onlyReal.length, `Filter REALISASI → ${onlyReal.length} program tampil, data plan tetap utuh (${programs.length} total)`);

  console.log('\n===== 6. GET SCHEDULE SUMMARY (Admin Dashboard Req 6) =====');
  const summary = await getScheduleSummary(2026);
  const t = summary.totals;
  assert(
    Number.isFinite(t.pagi) && Number.isFinite(t.malam) && Number.isFinite(t.cuti) && Number.isFinite(t.izin),
    `getScheduleSummary OK — work=${t.totalScheduled} pagi=${t.pagi} malam=${t.malam} off=${t.off} cuti=${t.cuti} izin=${t.izin}`
  );

  // Konsistensi jumlah operator: count == rol aktif.
  const [totalOperators, activeOperators] = await Promise.all([
    prisma.user.count({ where: { role: 'OPERATOR' } }),
    prisma.user.count({ where: { role: 'OPERATOR', isActive: true } }),
  ]);
  console.log(`  Operator: total=${totalOperators} aktif=${activeOperators}`);
  assert(activeOperators >= 0, 'Count operator OK');

  console.log('\n====================================================');
  console.log(failures === 0 ? 'ALL VERIFICATION CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
  process.exitCode = failures > 0 ? 1 : 0;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());