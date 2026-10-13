// ============================================================================
// KONFIGURASI INFO ORF — DATA OPERASIONAL PER JAM
// ----------------------------------------------------------------------------
// Template default untuk FORM input (label + satuan) dan pengaturan tampilan.
// Nilai INI adalah placeholder yang bisa disesuaikan sesuai terminologi
// operasional asli — tidak mengubah struktur database (model generik).
// Struktur data tetap menyimpan nilai APA ADANYA tanpa agregasi lintas jam.
// ============================================================================

export const INFO_ORF_SECTION_LABELS: Record<string, string> = {
  UPSTREAM: 'Up Stream',
  TOTAL: 'Total Penyaluran',
  FSRU: 'Data FSRU',
};

export const INFO_ORF_SECTION_ORDER = ['UPSTREAM', 'TOTAL', 'FSRU'] as const;

/** Satuan yang diizinkan pada metrik (validasi tidak mengubah nilai asli). */
export const INFO_ORF_ALLOWED_UNITS = [
  'MMSCFD',
  'MSCFD',
  'm³',
  'm³/h',
  'Mscf/h',
  'MMscfd',
  'Mmbtu/h',
  'M3/H',
  'M3',
  'Barg',
  'Deg F',
  'psig',
  'bar',
  'mbar',
  'kPa',
  '%',
  '°C',
  'mmH2O',
  'ton',
  'jam',
  'menit',
  'unit',
  'kali',
] as const;

export interface InfoOrfMetricTemplate {
  section: 'UPSTREAM' | 'TOTAL' | 'FSRU';
  key: string;
  label: string;
  unit: string;
}

/** Template metrik default yang dimuat saat form laporan baru dibuka. */
export const INFO_ORF_METRIC_TEMPLATE: InfoOrfMetricTemplate[] = [
  { section: 'UPSTREAM', key: 'PRESSURE', label: 'Pressure Up Stream', unit: 'Barg' },
  { section: 'UPSTREAM', key: 'TEMPERATURE', label: 'Temperature Up Stream', unit: 'Deg F' },
  { section: 'TOTAL', key: 'TOTAL_FLOW', label: 'Total MK + TP + MTW', unit: 'MMscfd' },
  { section: 'FSRU', key: 'LNG_FLOW', label: 'LNG Flow', unit: 'M3/H' },
  { section: 'FSRU', key: 'ROB_LNG', label: 'ROB LNG', unit: 'M3' },
];

export interface InfoOrfLineTemplate {
  lineCode: string;
  lineName: string;
}

/** Template line penyaluran default (bisa ditambah/diubah/dihapus di form). */
export const INFO_ORF_LINE_TEMPLATE: InfoOrfLineTemplate[] = [
  { lineCode: 'LINE-350-PLN-IP-PRIOK', lineName: 'Line 350 Psig — PLN IP Priok PGU' },
  { lineCode: 'LINE-350-PLN-NP-MK', lineName: 'Line 350 Psig — PLN NP MK' },
  { lineCode: 'LINE-620-PLN-NP-MK', lineName: 'Line 620 Psig — PLN NP MK' },
  { lineCode: 'LINE-PERTAGAS-PLN-NP-MTW', lineName: 'Line Pertagas — PLN NP MTW' },
  { lineCode: 'LINE-PEAKER-PLN-NP-MK', lineName: 'Line Peaker — PLN NP MK' },
  { lineCode: 'LINE-PGN', lineName: 'Line PGN' },
];

export const INFO_ORF_INITIAL_DATA = {
  reportDate: '2026-10-13',
  reportHour: '08',
  metrics: {
    PRESSURE: 51.76,
    TEMPERATURE: 81.24,
    TOTAL_FLOW: 352.655,
    LNG_FLOW: 825,
    ROB_LNG: 99370,
  },
  lines: [
    { lineCode: 'LINE-350-PLN-IP-PRIOK', flowRate: 181.55, volume: 7564.61, energy: 7862.26, temperature: 63.53 },
    { lineCode: 'LINE-350-PLN-NP-MK', flowRate: 63.60, volume: 2650.03, energy: 2754.44, temperature: 59.73 },
    { lineCode: 'LINE-620-PLN-NP-MK', flowRate: 36.43, volume: 1517.93, energy: 1577.57, temperature: 74.58 },
    { lineCode: 'LINE-PERTAGAS-PLN-NP-MTW', flowRate: 14.10, volume: 587.54, energy: 610.61, temperature: 81.21 },
    { lineCode: 'LINE-PEAKER-PLN-NP-MK', flowRate: 56.97, volume: 2373.83, energy: 2468.19, temperature: 81.46 },
    { lineCode: 'LINE-PGN', flowRate: 0, volume: 0, energy: 0, temperature: 78.67 },
  ],
  nextCargo: {
    cargoCode: 'LN40',
    etaDate: '2026-10-16',
  },
} as const;

export const INFO_ORF_HOURS: string[] = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

export const NEXT_CARGO_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Terjadwal',
  DISCHARGING: 'Sedang Bongkar',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

/** Konversi nilai Decimal / number ke number aman untuk tampilan & JSON. */
export function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Format angka tanpa desimal yang tidak perlu (mis. 245.5 → "245.5"). */
export function formatValue(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return String(Number(value.toFixed(4)));
}
