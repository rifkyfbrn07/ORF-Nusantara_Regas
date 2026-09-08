/**
 * ============================================================================
 * SUMBER DATA PROGRAM KERJA (SOURCE OF TRUTH)
 * ============================================================================
 * "PROGRAM KERJA DEPARTEMEN DISTRIBUSI GAS DAN MANAJEMEN ORF TAHUN 2026"
 * (prototipe program - Plan 2026.pdf)
 *   - P = Plan
 *   - R = Realisasi (nilai % per minggu I, II, III, IV pada bulan terkait)
 *   - Sel kosong pada baris R = belum ada realisasi tercatat di dokumen.
 *
 * CATATAN AKURASI: nama program, nilai R, dan keterangan dipertahankan sesuai
 * dokumen. Perbaikan ejaan tik/scan yang tidak mengubah makna: "Pengaadan" ->
 * "Pengadaan", "Navigasii" -> "Navigasi", "Bechmark" -> "Benchmark",
 * "Enggagement" -> "Engagement", "lakasanakan" -> "laksanakan",
 * "Pelaksaan" -> "Pelaksanaan".
 * ============================================================================
 */

export type ProgramCategorySeed =
  | 'PENGADAAN'
  | 'RAPAT_KOORDINASI'
  | 'OPERASIONAL_RUTIN'
  | 'AUDIT';

export interface ProgramMonthEntrySeed {
  month: number; // 1 = Jan ... 12 = Des
  week: number; // 1 = I ... 4 = IV
  realization: number; // nilai R (%)
}

export interface ProgramKerjaSeed {
  category: ProgramCategorySeed;
  sequence: number;
  name: string;
  plan?: string;
  realization?: string;
  notes?: string;
  entries: ProgramMonthEntrySeed[];
}

/** Realisasi rutin harian tercatat Januari I s.d. Juni I (21 minggu) sesuai dokumen. */
export const DAILY_21_WEEKS: ProgramMonthEntrySeed[] = [
  { month: 1, week: 1, realization: 100 }, { month: 1, week: 2, realization: 100 }, { month: 1, week: 3, realization: 100 }, { month: 1, week: 4, realization: 100 },
  { month: 2, week: 1, realization: 100 }, { month: 2, week: 2, realization: 100 }, { month: 2, week: 3, realization: 100 }, { month: 2, week: 4, realization: 100 },
  { month: 3, week: 1, realization: 100 }, { month: 3, week: 2, realization: 100 }, { month: 3, week: 3, realization: 100 }, { month: 3, week: 4, realization: 100 },
  { month: 4, week: 1, realization: 100 }, { month: 4, week: 2, realization: 100 }, { month: 4, week: 3, realization: 100 }, { month: 4, week: 4, realization: 100 },
  { month: 5, week: 1, realization: 100 }, { month: 5, week: 2, realization: 100 }, { month: 5, week: 3, realization: 100 }, { month: 5, week: 4, realization: 100 },
  { month: 6, week: 1, realization: 100 },
];

/** Laporan bulanan: R = 100 pada minggu I setiap bulan Jan-Jun sesuai dokumen. */
export const MONTHLY_6: ProgramMonthEntrySeed[] = [
  { month: 1, week: 1, realization: 100 },
  { month: 2, week: 1, realization: 100 },
  { month: 3, week: 1, realization: 100 },
  { month: 4, week: 1, realization: 100 },
  { month: 5, week: 1, realization: 100 },
  { month: 6, week: 1, realization: 100 },
];

export const PROGRAM_KERJA_2026: ProgramKerjaSeed[] = [
  // ============================ A. PENGADAAN ============================
  {
    category: 'PENGADAAN',
    sequence: 1,
    name: 'Pengadaan Jasa Pelayanan Radio Trunking',
    notes: 'Kontrak baru 2026',
    entries: [{ month: 5, week: 3, realization: 50 }],
  },
  {
    category: 'PENGADAAN',
    sequence: 2,
    name: 'Pengadaan Patroli Pengawasan jalur pipa bawah laut dan penunjang operasi',
    notes: 'Kontrak baru 2026',
    entries: [{ month: 3, week: 4, realization: 80 }],
  },
  {
    category: 'PENGADAAN',
    sequence: 3,
    name: 'Pengadaan Barton Chart',
    entries: [{ month: 1, week: 1, realization: 100 }],
  },
  {
    category: 'PENGADAAN',
    sequence: 4,
    name: 'Pengadaan Jasa Kalibrasi Gas Detector (Merk MSA)',
    entries: [{ month: 5, week: 4, realization: 90 }],
  },
  {
    category: 'PENGADAAN',
    sequence: 5,
    name: 'Pengadaan Bahan Bakar EDG (pada saat level 600 liter)',
    notes: 'Pembelian tergantung level tank solar ± 600 L',
    entries: [{ month: 4, week: 1, realization: 100 }],
  },
  {
    category: 'PENGADAAN',
    sequence: 6,
    name: 'Pengadaan Jasa Perpanjangan KIR & STNK Mobil DAMKAR',
    entries: [{ month: 4, week: 4, realization: 0 }],
  },

  // ======================== B. RAPAT KOORDINASI ========================
  {
    category: 'RAPAT_KOORDINASI',
    sequence: 1,
    name: 'Rapat Koordinasi DIV Operasi',
    entries: [{ month: 6, week: 1, realization: 100 }],
  },
  {
    category: 'RAPAT_KOORDINASI',
    sequence: 2,
    name: 'Rapat Koordinasi Departemen Distribusi Gas & ORF',
    entries: [
      { month: 5, week: 1, realization: 100 },
      { month: 6, week: 1, realization: 100 },
    ],
  },
  {
    category: 'RAPAT_KOORDINASI',
    sequence: 3,
    name: 'Rapat Koordinasi Penyaluran Gas NR-PLN (3 bulan)',
    entries: [{ month: 4, week: 4, realization: 100 }],
  },
  {
    category: 'RAPAT_KOORDINASI',
    sequence: 5,
    name: 'Gas Coordination Meeting (GCM)',
    entries: [
      { month: 2, week: 3, realization: 100 },
      { month: 3, week: 4, realization: 0 },
      { month: 4, week: 4, realization: 0 },
      { month: 5, week: 4, realization: 0 },
    ],
  },
  {
    category: 'RAPAT_KOORDINASI',
    sequence: 6,
    name: 'Rapat Koordinasi Pgasol (3 bulan)',
    notes: 'Awal pelaksanaan di akhir bulan Juli',
    entries: [],
  },
  {
    category: 'RAPAT_KOORDINASI',
    sequence: 7,
    name: 'Kegiatan Olahraga Bersama (Customer Engagement)',
    entries: [],
  },
  {
    category: 'RAPAT_KOORDINASI',
    sequence: 8,
    name: 'Benchmark Pertamina Group',
    entries: [],
  },
  {
    category: 'RAPAT_KOORDINASI',
    sequence: 9,
    name: 'Kunjungan Ke PLN Group',
    plan: 'Rencana : Kunjungan P2B',
    realization: 'Realisasi : Kunjungan PLN NP UP MTW',
    entries: [],
  },
  {
    category: 'RAPAT_KOORDINASI',
    sequence: 10,
    name: 'Rapat Rekon BMN',
    entries: [{ month: 2, week: 3, realization: 100 }],
  },
  {
    category: 'RAPAT_KOORDINASI',
    sequence: 11,
    name: 'Rapat Rekon FSA',
    entries: [{ month: 5, week: 4, realization: 100 }],
  },
  {
    category: 'RAPAT_KOORDINASI',
    sequence: 12,
    name: 'Rekon BOG',
    entries: [],
  },

  // ======================== C. OPERASIONAL RUTIN ========================
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 1,
    name: 'Monitoring Penyaluran Gas (Harian)',
    notes: 'Di laksanakan setiap harinya',
    entries: DAILY_21_WEEKS,
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 2,
    name: 'Monitoring Peralatan Operasi (Harian)',
    notes: 'Di laksanakan setiap harinya',
    entries: DAILY_21_WEEKS,
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 3,
    name: 'Monitoring Patroli Laut dan Sarana Navigasi (Harian)',
    notes: 'Di laksanakan setiap harinya',
    entries: DAILY_21_WEEKS,
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 4,
    name: 'Kegiatan Drill HSSE',
    notes: 'Target pelaksanaan setahun 6 kali',
    entries: [{ month: 5, week: 3, realization: 100 }],
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 5,
    name: 'Satgas Natal & tahun baru (NATARU)',
    entries: [{ month: 1, week: 1, realization: 100 }],
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 6,
    name: 'Satgas Ramadhan & Idul fitri (RAFI)',
    entries: [
      { month: 4, week: 1, realization: 100 },
      { month: 4, week: 2, realization: 100 },
    ],
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 7,
    name: 'Permit To Work',
    notes: 'Pelaksanaan tergantung dari Fungsi lain',
    entries: DAILY_21_WEEKS,
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 8,
    name: 'Laporan Manajemen (Bulanan)',
    entries: MONTHLY_6,
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 9,
    name: 'Laporan Sub Holding Gas (Bulanan)',
    entries: MONTHLY_6,
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 10,
    name: 'Laporan Risk (3 Bulan)',
    entries: [{ month: 4, week: 1, realization: 100 }],
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 11,
    name: 'Laporan TOP Risk',
    entries: MONTHLY_6,
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 12,
    name: 'Laporan Daily Report (Harian)',
    notes: 'Di laksanakan setiap harinya',
    entries: DAILY_21_WEEKS,
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 13,
    name: 'Laporan Billing Penyaluran Gas (2 Mingguan)',
    entries: [
      { month: 1, week: 4, realization: 100 },
      { month: 2, week: 3, realization: 100 },
      { month: 3, week: 4, realization: 100 },
      { month: 4, week: 4, realization: 100 },
      { month: 5, week: 4, realization: 100 },
    ],
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 14,
    name: 'Laporan Start Discharge Cargo',
    notes: 'Mengikuti Jadwal kedatangan kargo',
    entries: DAILY_21_WEEKS,
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 16,
    name: 'House Keeping',
    notes: "Di laksanakan Setiap hari Jum'at",
    entries: [],
  },
  {
    category: 'OPERASIONAL_RUTIN',
    sequence: 17,
    name: 'Review TKI/TKO',
    entries: [],
  },

  // ============================== D. AUDIT ==============================
  {
    category: 'AUDIT',
    sequence: 1,
    name: 'Internal Audit Sistem Manajemen Terpadu (SMT)',
    notes: 'Pelaksanaan tergantung dari fungsi QMR',
    entries: [],
  },
  {
    category: 'AUDIT',
    sequence: 2,
    name: 'Preliminary Survey Audit atas Biaya Operasional Regasifikasi PT Nusantara Regas',
    entries: [{ month: 4, week: 4, realization: 100 }],
  },
  {
    category: 'AUDIT',
    sequence: 3,
    name: 'Eksternal Audit Sistem Manajemen Terpadu (SMT)',
    notes: 'Pelaksanaan tergantung dari fungsi QMR',
    entries: [],
  },
  {
    category: 'AUDIT',
    sequence: 4,
    name: 'SUPREME',
    notes: 'Pelaksanaan tergantung dari fungsi HSSE',
    entries: [],
  },
];

