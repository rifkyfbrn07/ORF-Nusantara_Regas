/**
 * ============================================================================
 * SUMBER DATA JADWAL OPERATOR (SOURCE OF TRUTH)
 * ============================================================================
 * "Jadwal Operator ORF Muara Karang" (September-Oktbr 2026_Rev.pdf)
 *   - Pg  = 07.00 - 19.00
 *   - Mlm = 19.00 - 07.00 (overnight)
 *   - Off = Libur
 *   - `*` = HSSE Marshall
 *
 * Nama operator, posisi, team, shift per tanggal, dan contact person
 * dipertahankan sesuai dokumen (September 2026: 30 hari, 1 Sep = Selasa;
 * Oktober 2026: 31 hari, 1 Okt = Kamis).
 * ============================================================================
 */

export type RosterShiftCode = 'Pg' | 'Mlm' | 'Off';

export interface RosterOperatorSeed {
  team: 'A' | 'B' | 'C';
  name: string;
  /** Posisi sesuai dokumen: Supervisor/Lead Operator, DCS, Field, atau kosong. */
  positionSuffix?: 'Supervisor/Lead Operator' | 'DCS' | 'Field';
  phone: string;
  /** Tanda `*` pada dokumen = HSSE Marshall */
  hsseMarshall: boolean;
  /** Deret shift per tanggal 1..akhir bulan (sesuai dokumen). */
  shifts: RosterShiftCode[];
}

export interface RosterMonthSeed {
  year: number;
  month: number;
  operators: RosterOperatorSeed[];
}

export const ROSTER_ORF_MUARA_KARANG: RosterMonthSeed[] = [
  {
    year: 2026,
    month: 9, // September 2026 (1 Sep = Selasa)
    operators: [
      {
        team: 'A',
        name: 'M. T Ibrahim',
        positionSuffix: 'Supervisor/Lead Operator',
        phone: '081806813068',
        hsseMarshall: false,
        shifts: ['Pg', 'Pg', 'Pg', 'Pg', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Pg', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Pg', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Pg', 'Off', 'Off', 'Pg', 'Pg', 'Pg'],
      },
      {
        team: 'A',
        name: 'Itqi Arradi',
        phone: '08161404410',
        hsseMarshall: true,
        shifts: ['Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm'],
      },
      {
        team: 'A',
        name: 'Hanif Nur Ihsan',
        positionSuffix: 'DCS',
        phone: '087868986998',
        hsseMarshall: false,
        shifts: ['Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm'],
      },
      {
        team: 'A',
        name: 'Haerul Hafiz',
        positionSuffix: 'Field',
        phone: '089524803801',
        hsseMarshall: false,
        shifts: ['Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm'],
      },
      {
        team: 'A',
        name: 'M.Sauqi Rizullah',
        positionSuffix: 'Field',
        phone: '081398822501',
        hsseMarshall: false,
        shifts: ['Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm'],
      },
      {
        team: 'B',
        name: 'Zulfi Tresna Kusuma',
        phone: '082321963796',
        hsseMarshall: true,
        shifts: ['Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off'],
      },
      {
        team: 'B',
        name: 'Qoni Fahman',
        positionSuffix: 'DCS',
        phone: '087888823066',
        hsseMarshall: false,
        shifts: ['Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off'],
      },
      {
        team: 'B',
        name: 'Nurman Assauri',
        positionSuffix: 'Field',
        phone: '081311874739',
        hsseMarshall: false,
        shifts: ['Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off'],
      },
      {
        team: 'B',
        name: 'Yunus Fauzan Apriliatna',
        positionSuffix: 'Field',
        phone: '081336021539',
        hsseMarshall: false,
        shifts: ['Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off'],
      },
      {
        team: 'C',
        name: 'Andri Lusanto',
        phone: '085693044343',
        hsseMarshall: true,
        shifts: ['Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg'],
      },
      {
        team: 'C',
        name: 'Erwin Maulana',
        positionSuffix: 'DCS',
        phone: '081227388669',
        hsseMarshall: false,
        shifts: ['Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg'],
      },
      {
        team: 'C',
        name: 'Muhammad Najmi Al Fayyadl',
        positionSuffix: 'Field',
        phone: '081324328474',
        hsseMarshall: false,
        shifts: ['Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg'],
      },
      {
        team: 'C',
        name: 'Muhammad Ibrahim Hakam',
        positionSuffix: 'Field',
        phone: '082217689951',
        hsseMarshall: false,
        shifts: ['Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg'],
      },
    ],
  },
  {
    year: 2026,
    month: 10, // Oktober 2026 (1 Okt = Kamis)
    operators: [
      {
        team: 'A',
        name: 'M. T Ibrahim',
        positionSuffix: 'Supervisor/Lead Operator',
        phone: '081806813068',
        hsseMarshall: false,
        shifts: ['Pg', 'Pg', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Pg', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Pg', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Pg', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Pg', 'Off'],
      },
      {
        team: 'A',
        name: 'Itqi Arradi',
        phone: '08161404410',
        hsseMarshall: true,
        shifts: ['Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg'],
      },
      {
        team: 'A',
        name: 'Hanif Nur Ihsan',
        positionSuffix: 'DCS',
        phone: '087868986998',
        hsseMarshall: false,
        shifts: ['Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg'],
      },
      {
        team: 'A',
        name: 'Haerul Hafiz',
        positionSuffix: 'Field',
        phone: '089524803801',
        hsseMarshall: false,
        shifts: ['Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg'],
      },
      {
        team: 'A',
        name: 'M.Sauqi Rizullah',
        positionSuffix: 'Field',
        phone: '081398822501',
        hsseMarshall: false,
        shifts: ['Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg'],
      },
      {
        team: 'B',
        name: 'Zulfi Tresna Kusuma',
        phone: '082321963796',
        hsseMarshall: true,
        shifts: ['Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm'],
      },
      {
        team: 'B',
        name: 'Qoni Fahman',
        positionSuffix: 'DCS',
        phone: '087888823066',
        hsseMarshall: false,
        shifts: ['Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm'],
      },
      {
        team: 'B',
        name: 'Ibrahim Abraham',
        positionSuffix: 'Field',
        phone: '081311874739',
        hsseMarshall: false,
        shifts: ['Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm'],
      },
      {
        team: 'B',
        name: 'Aji Raisnawan Eka Sulistyanto',
        positionSuffix: 'Field',
        phone: '081336021539',
        hsseMarshall: true,
        shifts: ['Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm'],
      },
      {
        team: 'C',
        name: 'Andri Lusanto',
        phone: '085693044343',
        hsseMarshall: true,
        shifts: ['Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off'],
      },
      {
        team: 'C',
        name: 'Muhammad Najmi Al Fayyadl',
        positionSuffix: 'DCS',
        phone: '081227388669',
        hsseMarshall: false,
        shifts: ['Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off'],
      },
      {
        team: 'C',
        name: 'Erwin',
        positionSuffix: 'Field',
        phone: '081324328474',
        hsseMarshall: false,
        shifts: ['Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off'],
      },
      {
        team: 'C',
        name: 'Yunus Fauzan Apriliatna',
        positionSuffix: 'Field',
        phone: '082217689951',
        hsseMarshall: false,
        shifts: ['Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off', 'Off', 'Off', 'Pg', 'Pg', 'Pg', 'Pg', 'Mlm', 'Mlm', 'Mlm', 'Mlm', 'Off', 'Off'],
      },
    ],
  },
];

/** Shift reusable roster ORF (sesuai ket dokumen). */
export const ORF_SHIFTS = [
  {
    code: 'ORF_PAGI',
    name: 'PAGI',
    startTime: '07:00',
    endTime: '19:00',
    durationHours: 12,
    requiredCount: 5,
    description: 'Roster Operator ORF Muara Karang — Pg (07.00 - 19.00 WIB)',
  },
  {
    code: 'ORF_MALAM',
    name: 'MALAM',
    startTime: '19:00',
    endTime: '07:00',
    durationHours: 12,
    requiredCount: 4,
    description: 'Roster Operator ORF Muara Karang — Mlm (19.00 - 07.00 WIB, overnight)',
  },
  {
    code: 'ORF_OFF',
    name: 'OFF',
    startTime: '00:00',
    endTime: '00:00',
    durationHours: 0,
    requiredCount: 0,
    description: 'Roster Operator ORF Muara Karang — Off (Libur)',
  },
] as const;
