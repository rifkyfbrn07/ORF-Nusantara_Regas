/**
 * ============================================================================
 * NORMALIZER — kunci pencocokan data antar sheet dan dengan database.
 * ============================================================================
 * Normalisasi hanya digunakan untuk MENCOCOKKAN record (mencegah duplikat).
 * Nama/keterangan yang disimpan ke database SELALU teks asli dari dokumen.
 *
 * Kamus ejaan memuat varian ejaan yang memang ada di dokumen sumber
 * (mis. "Pengaadan", "Navigasii", "Enggagement", "Bechmark") sehingga record
 * yang sama dari dua sheet / dua versi dokumen dapat digabung tanpa kehilangan
 * data, tanpa mengarang nama baru.
 * ============================================================================
 */

/** Perbaikan varian penulisan yang terbukti ada di dokumen sumber. */
const TYPO_DICT: Record<string, string> = {
  enggagement: 'engagement',
  navigasii: 'navigasi',
  bechmark: 'benchmark',
  pengaadan: 'pengadaan',
  lakasanakan: 'laksanakan',
  pelaksaan: 'pelaksanaan',
  klarisifikasi: 'klarifikasi',
  trungking: 'trunking',
  exsisting: 'existing',
  terlealisasi: 'terealisasi',
};

function applyTypoDict(input: string): string {
  let out = input;
  for (const [from, to] of Object.entries(TYPO_DICT)) {
    out = out.replaceAll(from, to);
  }
  return out;
}

/** Kunci pencocokan: huruf kecil, kamus ejaan, spasi tunggal. */
export function normalizeMatchKey(input: string): string {
  return applyTypoDict(
    input
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N} ]/gu, '')
  ).trim();
}

function tokenSet(key: string): Set<string> {
  return new Set(key.split(' ').filter(Boolean));
}

function tokenJaccard(a: string, b: string): number {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Apakah dua nama program cocok dianggap SATU record.
 * Digunakan untuk: merge sheet "Plan 2026" vs "Plan 2026 (2)" dan
 * pencocokan dengan Program Kerja yang sudah ada di database.
 */
export function namesMatch(rawA: string, rawB: string): boolean {
  const a = normalizeMatchKey(rawA);
  const b = normalizeMatchKey(rawB);
  if (!a || !b) return false;
  if (a === b) return true;

  // Satu nama merupakan perluasan dari nama lain ("Laporan TOP Risk" ↔
  // "Laporan TOP Risk (NR Emas)") → dianggap sama, syarat awalan sama.
  const minLen = Math.min(a.length, b.length);
  if (minLen >= 10) {
    const prefixSame = a.slice(0, 10) === b.slice(0, 10);
    if (prefixSame && (a.includes(b) || b.includes(a))) return true;
  }

  // Fallback: kesamaan kata (token Jaccard) untuk varian ejaan ringan
  // ("Bechmark Pertamina Group" ↔ "Bechmark Pertamina/PGN Group").
  if (a.length >= 12 && b.length >= 12) {
    const firstTokenA = a.split(' ')[0];
    const firstTokenB = b.split(' ')[0];
    if (firstTokenA && firstTokenA === firstTokenB) {
      if (tokenJaccard(a, b) >= 0.7) return true;
    }
  }

  return false;
}