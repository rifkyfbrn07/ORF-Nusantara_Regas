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
  {
    id: 'activox',
    name: 'ActivoX',
    description: 'AIMS NR',
    url: 'http://aimsnr.pertamina.com',
  },
  {
    id: 'onepro',
    name: 'ONEPRO',
    description: 'ONEPRO',
    url: 'https://apps.pertamina.com/onepro',
  },
  {
    id: 'gep',
    name: 'GEP',
    description: 'GEP',
    url: 'https://idploginuat.gep.com/Logon?ReturnUrl=%2Fconnect%2Fauthorize%2Fcallback%3Fclient_id%3Dmvc%26redirect_uri%3Dhttps%253A%252F%252Fsmartuat-auth.gep.com%252Ffederation%252Fgeplogin%252Fsignin%26response_type%3Dcode%26scope%3Dopenid%2520profile%2520email%26code_challenge%3Dl8ml7wg-9wRh3YfdDxWWeg-6JoflPYFy-dbfC6K5Sv4%26code_challenge_method%3DS256%26nonce%3D639201125677883418.Mzk5YjA3MGItNWMxZS00Y2Y4LTljNzMtYWNmOTg4NzczNmQzMDc2NWY0NzEtMTJhMy00MDJlLWIzYTAtNzA5ODExNjk0NjU3%26state%3DRCRPBBLXZUu67W97H5mbVtDLzh0pwffNEpE1QmTLdKJwI79hq8o1NNR4Qp8ikFMBFCZRl-usEdcYW4Kr0JM-knVaJ9_xWWT7wluxFMmClp_pZW5UP__ckyIsMRIU3_rMVxSLnyjYERjAxr2NsmK6JGK70rSw-esHUM7iLMpgx32EsvDRGLsKsjlc77RfEfKqHmdnow03U-tySSk4C3wEf1KDjP3xuhZfOrQohnyjGbmvN4jG11eV0g_OZoPPYDnAW2IY4Dm1yXyN4ajfzNYj9R7_sVXOz2cYYQyzhbxsp7Jt-mjM6Oab3n_BDdbAxGGdDXd-_7dnMwECv7G3eiI_30_6ZpmO6yO4Zsj2wX2bHSLBfUayY052GxQ3ljjKr-9Xe_yOL-5KITy0_EKAHqpMDH59aScNtNRj5yc89hBYScb7I8f6NTSOABGs-bXUDfMZ3PzM1LCJMwlj1JvSNlTCIA',
  },
];