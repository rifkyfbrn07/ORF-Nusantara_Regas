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
  { section: 'UPSTREAM', key: 'SUPPLY_FLOW', label: 'Flow Gas Masuk (Upstream)', unit: 'MMSCFD' },
  { section: 'UPSTREAM', key: 'INLET_PRESSURE', label: 'Tekanan Inlet', unit: 'psig' },
  { section: 'TOTAL', key: 'TOTAL_FLOW', label: 'Total Penyaluran Gas', unit: 'MMSCFD' },
  { section: 'TOTAL', key: 'TOTAL_VOLUME', label: 'Volume Kumulatif', unit: 'm³' },
  { section: 'FSRU', key: 'LNG_LEVEL', label: 'Level LNG Storage', unit: '%' },
  { section: 'FSRU', key: 'SENDOUT', label: 'Sendout / Regasifikasi', unit: 'MMSCFD' },
  { section: 'FSRU', key: 'TANK_PRESSURE', label: 'Tekanan Tank', unit: 'mbar' },
];

export interface InfoOrfLineTemplate {
  lineCode: string;
  lineName: string;
}

/** Template line penyaluran default (bisa ditambah/diubah/dihapus di form). */
export const INFO_ORF_LINE_TEMPLATE: InfoOrfLineTemplate[] = [
  { lineCode: 'LINE-01', lineName: 'PLN (Pembangkit)' },
  { lineCode: 'LINE-02', lineName: 'Jargas (Rumah Tangga)' },
  { lineCode: 'LINE-03', lineName: 'Industri' },
];

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
