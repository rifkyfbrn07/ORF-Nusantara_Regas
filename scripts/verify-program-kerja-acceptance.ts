import { PrismaClient } from '@prisma/client';
import { listProgramKerja, getProgramKerjaAnnualChart } from '../src/server/services/programKerjaService';
import { getProgramMonthStatus } from '../src/app/(dashboard)/manager/program-kerja/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('RUNNING ACCEPTANCE TESTS FOR PROGRAM KERJA');
  console.log('====================================================\n');

  const programs = await listProgramKerja({ year: 2026 });
  console.log(`Loaded ${programs.length} programs for year 2026.\n`);

  let allPassed = true;
  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
    } else {
      console.log(`[FAIL] ${testName}`);
      if (details) console.log(`       ${details}`);
      allPassed = false;
    }
  }

  // --- TEST 1: Status = REALISASI & Bulan = Desember (12) ---
  const decRealization = programs.filter((p) => getProgramMonthStatus(p, 12) === 'REALISASI');
  assert(
    decRealization.length === 0,
    'TEST 1: Status = REALISASI & Bulan = Desember -> 0 / kosong',
    `Found ${decRealization.length} programs with December realization (expected 0)`
  );

  // --- TEST 2: Status = PLAN & Bulan = Desember (12) ---
  const decPlan = programs.filter((p) => getProgramMonthStatus(p, 12) === 'PLAN');
  assert(
    decPlan.length > 0,
    `TEST 2: Status = PLAN & Bulan = Desember -> Program yang memiliki Plan Desember muncul (found ${decPlan.length})`,
    `Found ${decPlan.length} programs with December plan`
  );

  // --- TEST 3: Status = REALISASI & Bulan = Oktober (10) ---
  const octRealization = programs.filter((p) => getProgramMonthStatus(p, 10) === 'REALISASI');
  assert(
    octRealization.length === 0,
    'TEST 3: Status = REALISASI & Bulan = Oktober -> 0 / kosong',
    `Found ${octRealization.length} programs with October realization (expected 0)`
  );

  // --- TEST 4: Status = PLAN & Bulan = Oktober (10) ---
  const octPlan = programs.filter((p) => getProgramMonthStatus(p, 10) === 'PLAN');
  assert(
    octPlan.length > 0,
    `TEST 4: Status = PLAN & Bulan = Oktober -> Program yang memiliki Plan Oktober muncul (found ${octPlan.length})`,
    `Found ${octPlan.length} programs with October plan`
  );

  // --- TEST 5: Status = REALISASI & Bulan = September (9) ---
  const sepRealization = programs.filter((p) => getProgramMonthStatus(p, 9) === 'REALISASI');
  // Check that every program returned actually has realization in month 9
  const validSepReal = sepRealization.every((p) => p.months.some((m) => m.month === 9 && m.realization !== null && m.realization >= 100));
  assert(
    validSepReal,
    `TEST 5: Status = REALISASI & Bulan = September -> Hanya Realisasi September aktual (found ${sepRealization.length})`,
    'Some programs did not have actual September realization'
  );

  // --- TEST 6: Status = PLAN & Bulan = September (9) ---
  const sepPlan = programs.filter((p) => getProgramMonthStatus(p, 9) === 'PLAN');
  assert(
    sepPlan.length > 0,
    `TEST 6: Status = PLAN & Bulan = September -> Plan September dari Excel muncul (found ${sepPlan.length})`,
    `Found ${sepPlan.length} programs with September plan`
  );

  // --- TEST 7: Program Monthly Chart Data (Jan/Feb = Realisasi, Mar..Des = Plan) ---
  // E.g. Monitoring Penyaluran Gas (Harian): has realization in months 1..7 (Jan..Jul), but Mar..Dec planned
  const dailyProg = programs.find((p) => p.name.includes('Monitoring Penyaluran Gas'));
  if (dailyProg) {
    const m1Status = getProgramMonthStatus(dailyProg, 1);
    const m2Status = getProgramMonthStatus(dailyProg, 2);
    const m12Status = getProgramMonthStatus(dailyProg, 12);
    assert(
      m1Status === 'REALISASI' && m2Status === 'REALISASI' && m12Status === 'PLAN',
      'TEST 7: Multi-month program maintains per-month status (Jan/Feb=REALISASI, Dec=PLAN)',
      `M1=${m1Status}, M2=${m2Status}, M12=${m12Status}`
    );
  } else {
    assert(false, 'TEST 7: Program Monitoring Penyaluran Gas not found in database');
  }

  // --- Annual Chart Data Verification ---
  const annualChart = await getProgramKerjaAnnualChart(2026);
  const decPoint = annualChart.bar.find((b) => b.month === 'Des');
  assert(
    decPoint !== undefined && decPoint.realisasi === 0 && decPoint.plan > 0,
    `Annual Chart: December has plan=${decPoint?.plan} and realisasi=${decPoint?.realisasi} (expected realisasi=0)`,
    `December chart point: ${JSON.stringify(decPoint)}`
  );

  console.log('\n====================================================');
  if (allPassed) {
    console.log('ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('SOME ACCEPTANCE TESTS FAILED. PLEASE REVIEW.');
    process.exitCode = 1;
  }
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
