// ============================================================================
// APLIKASI — Centralized Configuration
// ----------------------------------------------------------------------------
// Daftar aplikasi/website internal yang sering digunakan user, ditampilkan
// sebagai shortcut pada menu "Aplikasi" di sidebar.
//
// CATATAN:
// - URL TIDAK boleh diubah/dipendekkan/diubah query parameter-nya.
// - IDAMAN hanya satu item (deduplicated dari daftar awal).
// - Struktur sengaja dibuat sederhana agar mudah dikembangkan menjadi
//   database di masa depan (cukup tambah objek baru di array ini).
// ============================================================================

export interface ApplicationLink {
  /** Identitas unik (slug) — dipakai sebagai React key. */
  id: string;
  /** Nama singkat aplikasi yang ditampilkan ke user. */
  name: string;
  /** Deskripsi singkat (UX aid) — hanya informasi yang sudah diketahui. */
  description: string;
  /** Destination URL — dibuka pada TAB BARU (target=_blank). */
  url: string;
}

export const APPLICATIONS: ApplicationLink[] = [
  {
    id: 'intra-iam',
    name: 'INTRA IAM',
    description: 'Internal IAM Pertamina',
    url: 'https://intra-iam.pertamina.com/Account/Login?returnUrl',
  },
  {
    id: 'idaman',
    name: 'IDAMAN',
    description: 'Portal IDAMAN',
    url: 'https://login.idaman.pertamina.com/Common/Login',
  },
  {
    id: 'esimi',
    name: 'E-SIMI',
    description: 'Sistem E-SIMI',
    url: 'http://appnr.pertamina.com/esimi/auth/login',
  },
  {
    id: 'gms-pgn',
    name: 'SIPGAS',
    description: 'SIPGAS',
    url: 'https://gms.pgn.co.id/home',
  },
  {
    id: 'digitravel',
    name: 'DTM',
    description: 'Digital Travel',
    url: 'https://digitravel.pertamina.com/Account/Login?ReturnUrl=%2F',
  },
  {
    id: 'ims',
    name: 'IMS',
    description: 'Integrated Management System',
    url: 'https://apps.pertamina.com/IMS20',
  },
  {
    id: 'estk',
    name: 'E-STK',
    description: 'E-STK',
    url: 'https://apps.pertamina.com/estk#!/estk/dashboard',
  },
  {
    id: 'evendor',
    name: 'IVENDOR',
    description: 'Vendor Management',
    url: 'https://apps.pertamina.com/new-ivendor/Account/Login?ReturnUrl=%2Fnew-ivendor%2Ftransaction%2Fbast',
  },
  {
    id: 'nregas-emas',
    name: 'NREGAS EMAS',
    description: 'Nusantara Regas Emas',
    url: 'https://nregasemas.nusantararegas.com/login?returnUrl=https%3A%2F%2Fnregasemas.nusantararegas.com%2F',
  },
  {
    id: 'lms',
    name: 'LMS',
    description: 'Learning Management System',
    url: 'https://apps.pertamina.com/lms2/login/index.php',
  },
  {
    id: 'portal',
    name: 'PORTAL',
    description: 'Portal aplikasi',
    url: 'http://appnr.pertamina.com/portal',
  },
  {
    id: 'ptw',
    name: 'PTW',
    description: 'Permit to Work',
    url: 'https://ptw.nusantararegas.com/login',
  },
];