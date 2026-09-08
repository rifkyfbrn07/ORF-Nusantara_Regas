/**
 * WORK PATTERN — pola kerja berbasis POSITION/JOB FUNCTION (bukan role).
 *
 * REGULAR (Shift Operator — DCS/Operator):
 *   6 hari kerja: 3 Pagi → 3 Malam, lalu 4 Off  (siklus 10 hari, repeat)
 *
 * FIELD (Pemantau Lapangan):
 *   4 hari kerja: 4 Pagi, lalu 2 Off            (siklus 6 hari, repeat)
 */

export type PatternShift = 'PAGI' | 'MALAM' | 'OFF';

export interface WorkPattern {
  key: 'REGULAR' | 'FIELD';
  label: string;
  description: string;
  cycle: PatternShift[];
}

export const WORK_PATTERNS: Record<'REGULAR' | 'FIELD', WorkPattern> = {
  REGULAR: {
    key: 'REGULAR',
    label: 'Regular Shift Operator',
    description: '6 hari kerja → 3 Pagi, 3 Malam, lalu 4 Off (siklus 10 hari)',
    cycle: ['PAGI', 'PAGI', 'PAGI', 'MALAM', 'MALAM', 'MALAM', 'OFF', 'OFF', 'OFF', 'OFF'],
  },
  FIELD: {
    key: 'FIELD',
    label: 'Field / Pemantau Lapangan',
    description: '4 hari kerja → 4 Pagi, lalu 2 Off (siklus 6 hari)',
    cycle: ['PAGI', 'PAGI', 'PAGI', 'PAGI', 'OFF', 'OFF'],
  },
};

/** Deret shift hasil pattern untuk `days` hari, dimulai pada offset tertentu dalam siklus. */
export function generatePatternShifts(
  pattern: WorkPattern,
  days: number,
  startOffset = 0
): PatternShift[] {
  const result: PatternShift[] = [];
  for (let i = 0; i < days; i++) {
    result.push(pattern.cycle[(startOffset + i + pattern.cycle.length * 1000) % pattern.cycle.length]);
  }
  return result;
}

/**
 * Menentukan pattern default dari POSITION (job function), bukan role:
 * posisi mengandung "field"/"lapangan" → FIELD; selain itu REGULAR.
 */
export function patternFromPosition(position: string): 'REGULAR' | 'FIELD' {
  const p = (position || '').toLowerCase();
  if (p.includes('field') || p.includes('lapangan')) return 'FIELD';
  return 'REGULAR';
}

export function patternShiftLabel(shift: PatternShift): string {
  return shift === 'PAGI' ? 'Pg' : shift === 'MALAM' ? 'Mlm' : 'Off';
}
