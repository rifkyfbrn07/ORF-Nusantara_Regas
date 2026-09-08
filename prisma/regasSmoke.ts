/**
 * Smoke test data & service REGAS (dihapus setelah validasi).
 */
import { PrismaClient } from '@prisma/client';
import { getRosterMonth } from '../src/server/services/rosterService';
import { getOperatorWorkStatus } from '../src/server/services/workStatusService';
import { listProgramKerja, getProgramKerjaStats } from '../src/server/services/programKerjaService';
import { formatJakartaDate } from '../src/lib/time';

const prisma = new PrismaClient();

const check = (label: string, cond: boolean) =>
  console.log(`${cond ? 'OK ' : 'FAIL'} ${label}`);

async function main() {
  const today = formatJakartaDate();
  console.log('today (Jakarta):', today);

  // ===== Roster September 2026 =====
  const sep = await getRosterMonth({
    year: 2026, month: 9,
    includeContacts: true,
    includeTodayStatus: false,
  });
  console.log('\n--- September 2026 ---');
  console.log('operators:', sep.operators.length, '| days:', sep.daysInMonth, '| months avail:', sep.availableMonths.map((m) => `${m.year}-${m.month}`).join(','));

  const byName = new Map(sep.operators.map((o) => [o.name, o]));
  const ibrahim = byName.get('M. T Ibrahim')!;
  const itqi = byName.get('Itqi Arradi')!;
  const zulfi = byName.get('Zulfi Tresna Kusuma')!;
  const andri = byName.get('Andri Lusanto')!;
  const hanif = byName.get('Hanif Nur Ihsan')!;

  // Verifikasi shift sesuai dokumen (1 Sep: Ibrahim Pg, Itqi Pg, Zulfi Mlm, Andri Off)
  check('1 Sep Ibrahim=Pg', ibrahim.days[0].shiftKey === 'PAGI');
  check('1 Sep Itqi=Pg', itqi.days[0].shiftKey === 'PAGI');
  check('1 Sep Zulfi=Mlm', zulfi.days[0].shiftKey === 'MALAM');
  check('1 Sep Andri=Off', andri.days[0].shiftKey === 'OFF');
  check('4 Sep Itqi=Mlm (overnight)', itqi.days[3].shiftKey === 'MALAM');
  check('4 Sep Zulfi=Off', zulfi.days[3].shiftKey === 'OFF');
  check('30 Sep Ibrahim=Pg', ibrahim.days[29].shiftKey === 'PAGI');
  check('counts Itqi Pg=11 Mlm=11 Off=8 (sesuai dokumen)', itqi.counts.pagi === 11 && itqi.counts.malam === 11 && itqi.counts.off === 8);
  check('HSSE Marshall: Itqi/Zulfi/Andri=true, Ibrahim=false', itqi.hsseMarshall && zulfi.hsseMarshall && andri.hsseMarshall && !ibrahim.hsseMarshall);
  check('Team mapping: Ibrahim=A, Zulfi=B, Andri=C', ibrahim.team === 'A' && zulfi.team === 'B' && andri.team === 'C');
  check('Contact terisi (includeContacts=true)', ibrahim.phone === '081806813068' && itqi.phone === '08161404410');
  check('1 Sep hari: Selasa', ibrahim.days[0].weekday === 'Sel');

  // ===== Roster Oktober 2026 =====
  const okt = await getRosterMonth({
    year: 2026, month: 10,
    includeContacts: false,
    includeTodayStatus: false,
  });
  console.log('\n--- Oktober 2026 ---');
  const oktBy = new Map(okt.operators.map((o) => [o.name, o]));
  check('Okt operators: 13', okt.operators.length === 13);
  check('31 hari', okt.daysInMonth === 31);
  check('1 Okt Ibrahim=Pg', oktBy.get('M. T Ibrahim')!.days[0].shiftKey === 'PAGI');
  check('1 Okt Ibrahim hari: Kamis', oktBy.get('M. T Ibrahim')!.days[0].weekday === 'Kam');
  check('1 Okt Itqi=Mlm', oktBy.get('Itqi Arradi')!.days[0].shiftKey === 'MALAM');
  check('2 Okt Itqi=Off', oktBy.get('Itqi Arradi')!.days[1].shiftKey === 'OFF');
  check('31 Okt Andri=Off', oktBy.get('Andri Lusanto')!.days[30].shiftKey === 'OFF');
  check('privacy: phone=null saat includeContacts=false', okt.operators.every((o) => o.phone === null));
  check('Okt punya Ibrahim Abraham & Aji Raisnawan', oktBy.has('Ibrahim Abraham') && oktBy.has('Aji Raisnawan Eka Sulistyanto'));

  // ===== Filter shift =====
  const sepFiltered = await getRosterMonth({
    year: 2026, month: 9, shiftFilter: 'MALAM',
    includeContacts: false, includeTodayStatus: false,
  });
  const zulfiF = sepFiltered.operators.find((o) => o.name === 'Zulfi Tresna Kusuma')!;
  check('filter MALAM: Zulfi 1 Sep=Mlm, Ibrahim 1 Sep dimasked',
    zulfiF.days[0].shiftKey === 'MALAM' && sepFiltered.operators.find((o) => o.name === 'M. T Ibrahim')!.days[0].shiftKey === null);

  // ===== Operator self view =====
  const self = await getRosterMonth({
    year: 2026, month: 9, onlyUserId: itqi.id,
    includeContacts: false, includeTodayStatus: true,
  });
  console.log('\n--- Operator self view ---');
  check('hanya 1 operator (diri sendiri)', self.operators.length === 1 && self.operators[0].name === 'Itqi Arradi');
  console.log('today status:', self.operators[0].todayStatus?.status, '-', self.operators[0].todayStatus?.statusLabel, '| today =', today);

  // ===== Work status integrasi =====
  console.log('\n--- Work status hari ini per operator (sample) ---');
  for (const op of [ibrahim, itqi, zulfi, andri, hanif]) {
    const ws = await getOperatorWorkStatus(op.id, today);
    const shift = op.days.find((d) => d.date === today);
    console.log(`  ${op.name}: schedule=${shift ? shift.shiftKey : '-'} -> status=${ws.status} (${ws.statusLabel})`);
  }

  // ===== Program Kerja =====
  const programs = await listProgramKerja({ year: 2026 });
  const stats = await getProgramKerjaStats(2026);
  console.log('\n--- Program Kerja 2026 ---');
  console.log('programs:', programs.length, '| total:', stats.total, '| plan:', stats.plan, '| realisasi:', stats.realisasi, '| onProgress:', stats.onProgress, '| belum:', stats.belumTerealisasi, '| avgProgress:', stats.avgProgress);

  // PROGRAM_CHECKS
  const radio = programs.find((p) => p.name === 'Pengadaan Jasa Pelayanan Radio Trunking')!;
  const kir = programs.find((p) => p.name === 'Pengadaan Jasa Perpanjangan KIR & STNK Mobil DAMKAR')!;
  const daily = programs.find((p) => p.name === 'Laporan Daily Report (Harian)')!;
  const lapMan = programs.find((p) => p.name === 'Laporan Manajemen (Bulanan)')!;
  const drill = programs.find((p) => p.name === 'Kegiatan Drill HSSE')!;
  const pgasol = programs.find((p) => p.name === 'Rapat Koordinasi Pgasol (3 bulan)')!;
  const supreme = programs.find((p) => p.name === 'SUPREME')!;
  const gcm = programs.find((p) => p.name === 'Gas Coordination Meeting (GCM)')!;
  const pln = programs.find((p) => p.name === 'Kunjungan Ke PLN Group')!;

  check('Radio Trunking: R=50 Mei III -> ON_PROGRESS', radio.progress === 50 && radio.status === 'ON_PROGRESS' && radio.months.some((m) => m.month === 5 && m.week === 3 && m.realization === 50));
  check('Radio Trunking keterangan: Kontrak baru 2026', radio.notes === 'Kontrak baru 2026');
  check('KIR & STNK: R=0 -> BELUM_TEREALISASI', kir.progress === 0 && kir.status === 'BELUM_TEREALISASI');
  check('Daily Report: 21 minggu -> REALISASI + keterangan', daily.status === 'REALISASI' && daily.months.length === 21 && daily.notes === 'Di laksanakan setiap harinya');
  check('Laporan Manajemen: 6 bulan minggu I', lapMan.months.length === 6 && lapMan.months.every((m) => m.week === 1 && m.realization === 100));
  check('Drill HSSE: keterangan target 6x/tahun', drill.status === 'REALISASI' && drill.notes === 'Target pelaksanaan setahun 6 kali');
  check('Pgasol: PLAN + keterangan Juli', pgasol.status === 'PLAN' && pgasol.notes === 'Awal pelaksanaan di akhir bulan Juli');
  check('SUPREME: PLAN + keterangan HSSE', supreme.status === 'PLAN' && supreme.notes === 'Pelaksanaan tergantung dari fungsi HSSE');
  check('GCM: (100,0,0,0) -> ON_PROGRESS 25%', gcm.status === 'ON_PROGRESS' && gcm.progress === 25);
  check('Kunjungan PLN: plan & realization teks dokumen', pln.plan === 'Rencana : Kunjungan P2B' && pln.realization === 'Realisasi : Kunjungan PLN NP UP MTW');
  console.log('\nSMOKE SELESAI');
}

main()
  .catch((e) => {
    console.error('SMOKE ERROR:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
