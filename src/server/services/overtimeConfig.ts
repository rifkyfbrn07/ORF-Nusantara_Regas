export interface OvertimeCalculationResult {
  isScheduledWork: boolean;
  actualDurationHours: number;
  overtimeHours: number;
  awalLembur: string;
  akhirLembur: string;
  keterangan: string;
  pemberiTugas: string;
  isIncomplete: boolean;
}

/**
 * Parameters for calculating day overtime.
 */
export interface CalculateDayOvertimeParams {
/**
 * Calculates work duration in hours between two time strings (HH:mm or HH.mm).
 * Correctly handles overnight shifts crossing midnight (e.g., 19:00 - 07:00 = 12 hours)
 * without negative duration.
 */
export function calculateDurationHours(timeIn: string, timeOut: string): number {
  if (!timeIn || !timeOut) return 0;

  const [hIn, mIn] = parseTime(timeIn);
  const [hOut, mOut] = parseTime(timeOut);

  let startMins = hIn * 60 + mIn;
  let endMins = hOut * 60 + mOut;

  // Cross midnight detection: e.g. 19:00 to 07:00
  if (endMins < startMins) {
    endMins += 24 * 60;
  }

  const durationMinutes = endMins - startMins;
  return Math.round((durationMinutes / 60) * 100) / 100;
}

function parseTime(timeStr: string): [number, number] {
  const clean = timeStr.trim().replace('.', ':');
  const parts = clean.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return [isNaN(h) ? 0 : h, isNaN(m) ? 0 : m];
/**
 * Configuration and core operational calculation rules for Overtime (Lembur).
 * All calculation rules can be adjusted here without modifying code throughout the app.
 */
export interface OvertimeConfig {
  normalWorkHoursPerDay: number;
  defaultLocation: string;
  defaultUnitKerja: string;
  defaultSupervisor: string;
  defaultAtasanLangsung: string;
  defaultManagerNR: string;
  defaultManagerNRJabatan: string;
  defaultStaffPermata: string;
  defaultStaffPermataJabatan: string;
  defaultPjsKepalaDept: string;
}

export const OVERTIME_CONFIG: OvertimeConfig = {
  normalWorkHoursPerDay: 8,
  defaultLocation: 'NR Muara Karang',
  defaultUnitKerja: 'Operasi',
  defaultSupervisor: 'Muhammad Tauvik Ibrahim',
  defaultAtasanLangsung: 'Yosep Ismail Zulkarnain',
  defaultManagerNR: 'Yosep Ismail Zulkarnain',
  defaultManagerNRJabatan: 'Manager Gas Distribution & ORF Management',
  defaultStaffPermata: 'Aditya Paramayudha',
  defaultStaffPermataJabatan: 'Staff Project Support',
  defaultPjsKepalaDept: 'Pjs. Kepala Departemen Distribusi Gas & ORF',
};
/**
 * Configuration and core operational calculation rules for Overtime (Lembur).
 * All calculation rules can be adjusted here without modifying code throughout the app.
 */
export interface OvertimeConfig {
  normalWorkHoursPerDay: number;
  defaultLocation: string;
  defaultUnitKerja: string;
  defaultSupervisor: string;
  defaultAtasanLangsung: string;
  defaultManagerNR: string;
  defaultManagerNRJabatan: string;
  defaultStaffPermata: string;
  defaultStaffPermataJabatan: string;
  defaultPjsKepalaDept: string;
}

export const OVERTIME_CONFIG: OvertimeConfig = {
  normalWorkHoursPerDay: 8,
  defaultLocation: 'NR Muara Karang',
  defaultUnitKerja: 'Operasi',
  defaultSupervisor: 'Muhammad Tauvik Ibrahim',
  defaultAtasanLangsung: 'Yosep Ismail Zulkarnain',
  defaultManagerNR: 'Yosep Ismail Zulkarnain',
  defaultManagerNRJabatan: 'Manager Gas Distribution & ORF Management',
  defaultStaffPermata: 'Aditya Paramayudha',
  defaultStaffPermataJabatan: 'Staff Project Support',
  defaultPjsKepalaDept: 'Pjs. Kepala Departemen Distribusi Gas & ORF',
};

/**
 * Calculates work duration in hours between two time strings (HH:mm or HH.mm).
 * Correctly handles overnight shifts crossing midnight (e.g., 19:00 - 07:00 = 12 hours)
 * without negative duration.
 */
export function calculateDurationHours(timeIn: string, timeOut: string): number {
  if (!timeIn || !timeOut) return 0;

  const [hIn, mIn] = parseTime(timeIn);
  const [hOut, mOut] = parseTime(timeOut);

  let startMins = hIn * 60 + mIn;
  let endMins = hOut * 60 + mOut;

  // Cross midnight detection: e.g. 19:00 to 07:00
  if (endMins < startMins) {
    endMins += 24 * 60;
  }

  const durationMinutes = endMins - startMins;
  return Math.round((durationMinutes / 60) * 100) / 100;
}

function parseTime(timeStr: string): [number, number] {
  const clean = timeStr.trim().replace('.', ':');
  const parts = clean.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return [isNaN(h) ? 0 : h, isNaN(m) ? 0 : m];
}

export interface OvertimeCalculationResult {
  isScheduledWork: boolean;
  actualDurationHours: number;
  overtimeHours: number;
  awalLembur: string;
  akhirLembur: string;
  keterangan: string;
  pemberiTugas: string;
  isIncomplete: boolean;
}

/**
 * Parameters for calculating day overtime.
 */
export interface CalculateDayOvertimeParams {
  isScheduledWork: boolean; // From Roster: true = WORK, false = OFF
  isLeave?: boolean; // From Approved LeaveRequest: true = Cuti
  shiftCode?: string; // 'ORF_PAGI' | 'ORF_MALAM' | 'ORF_OFF'
  checkIn?: string | null; // e.g. "19.00" or "07.00"
  checkOut?: string | null; // e.g. "07.00" or "19.00"
  customNote?: string | null; // user-specified note if any
  supervisorName?: string | null; // supervisor or assigner
  // NEW: Use roster-based assumption when scheduled work (8 normal + 4 lembur assumption, not from actual attendance)
  assumeOnShift4HoursLembur?: boolean;
}

/**
 * Calculates overtime for a single day based on scheduled work status and attendance.
 *
 * Modes:
 * 1. assumeOnShift4HoursLembur=true: When true, ON schedule = 8 jam normal + 4 jam lembur assumption
 *    (used when attendance data is not yet active, using roster assumption)
 * 2. isScheduledWork=true, assumeOnShift4HoursLembur=false: ON schedule with actual attendance
 *    - Jam normal = 8 jam, Jam lembur = actual - 8 (hitung dari attendance)
 * 3. isScheduledWork=false, has checkIn/checkOut: OFF but working (backup)
 *    - Seluruh jam kerja = lembur
 * 4. isScheduledWork=false, no checkIn/checkOut: Off Duty
 * 5. isLeave=true: Cuti
 */
// 1. Cuti
  if (params.isLeave) {
    return {
      isScheduledWork: false,
      actualDurationHours: 0,
      overtimeHours: 0,
      awalLembur: '',
      akhirLembur: '',
      keterangan: 'Cuti',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // NEW: Roster-based assumption mode - when enabled, ON schedule = 8 normal + 4 lembur assumption
  if (params.assumeOnShift4HoursLembur) {
    // Mode: Asumsi roster ON = 8 jam normal + 4 jam lembur (bukan dari absensi aktual)
    // Ini digunakan ketika data absensi belum aktif, menggunakan asumsi roster
    const overtimeHours = 4; // Fixed 4 jam lembur assumption for ON shift
    const normalHours = 8; // Fixed 8 jam normal assumption
    const actualDurationHours = normalHours + overtimeHours; // 12 jam total diasumsikan

    // Determine shift times based on shiftCode for display purposes
    let awalLembur = '15.00';
    let akhirLembur = '19.00';
    let defaultNote = 'Lembur Shift Pagi';
    const isPagi = params.shiftCode === 'ORF_PAGI';
    const isMalam = params.shiftCode === 'ORF_MALAM';

    if (isMalam) {
      awalLembur = '03.00';
      akhirLembur = '07.00';
      defaultNote = 'Lembur Shift Malam';
    }

    return {
      isScheduledWork: true,
      actualDurationHours,
      overtimeHours,
      awalLembur,
      akhirLembur,
      keterangan: 'Lembur berdasarkan roster (8 jam normal + 4 jam lembur assumption), bukan absensi aktual',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // Determine if we have checkIn/checkOut
  const hasCheckIn = params.checkIn !== null && params.checkIn !== '';
  const hasCheckOut = params.checkOut !== null && params.checkOut !== '';

  // Extract checkIn/checkOut values for later use
  const rawIn = params.checkIn || '';
  const rawOut = params.checkOut || '';

  // Format time display: 19:00 -> 19.00
  const formattedIn = rawIn.replace(':', '.');
  const formattedOut = rawOut.replace(':', '.');

  // Determine shift type for display logic
  const isPagi = params.shiftCode === 'ORF_PAGI';
  const isMalam = params.shiftCode === 'ORF_MALAM';

  // 2. Off Duty (Jadwal OFF and not working) - ONLY if no confirmation
  if (!params.isScheduledWork && !hasCheckIn && !hasCheckOut) {
    return {
      isScheduledWork: false,
      actualDurationHours: 0,
      overtimeHours: 0,
      awalLembur: '',
      akhirLembur: '',
      keterangan: 'Tidak ada konfirmasi kerja pada hari OFF (berdasarkan roster)',
      pemberiTugas: '',
      isIncomplete: false,
    };
  }

  // If OFF but has explicit confirmation (checkIn/checkOut provided)
  if (!params.isScheduledWork && hasCheckIn && hasCheckOut) {
    // Operator OFF tapi bekerja - hitung seluruh jam sebagai lembur (backup)
    const actualDuration = calculateDurationHours(rawIn, rawOut);
    const overtimeHours = actualDuration;

    // Format time display: 19:00 -> 19.00 (already done above)
    // The formattedIn/formattedOut are already prepared above

    const defaultBackupNote = isPagi ? 'Lembur Back Up Tim C' : 'Lembur Back Up Tim A';

    return {
      isScheduledWork: false,
      actualDurationHours: actualDuration,
      overtimeHours,
      awalLembur: formattedIn,
      akhirLembur: formattedOut,
      keterangan: params.customNote || defaultBackupNote + ' (confirmed working on OFF day)',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // 3. Incomplete attendance flag (checkIn without checkOut)
  if (hasCheckIn && !hasCheckOut) {
    return {
      isScheduledWork: params.isScheduledWork,
      actualDurationHours: 0,
      overtimeHours: 0,
      awalLembur: '',
      akhirLembur: '',
      keterangan: params.customNote || 'Absensi Belum Lengkap (Perlu Pemeriksaan)',
      pemberiTugas: supervisor,
      isIncomplete: true,
    };
  }

  // 4. Calculate actual duration
  const actualDuration = calculateDurationHours(rawIn, rawOut);

  // 5. Operator terjadwal ON (WORK) - menggunakan asumsi roster
  // Jam normal = 8 jam, Jam lembur = 4 jam (assumption), Total = 12 jam
  // JANGKA KISAH: Bukan dari absensi aktual, melainkan asumsi roster
  if (params.isScheduledWork) {
    // Mode asumsi: 8 jam normal + 4 jam lembur tetap untuk shift ON
    const normalHours = 8;
    const overtimeHours = 4; // Fixed assumption, bukan Math.max(0, actualDuration - 8)
    const actualDurationHours = normalHours + overtimeHours; // 12 jam totaliasumsakan

    let awalLembur = '15.00';
    let akhirLembur = '19.00';
    let defaultNote = 'Lembur Shift Pagi';

    if (isPagi || (rawIn && rawIn.startsWith('07'))) {
      awalLembur = '15.00';
      defaultNote = 'Lembur Shift Pagi';
    } else if (isMalam || (rawIn && rawIn.startsWith('19'))) {
      awalLembur = '03.00';
      akhirLembur = '07.00';
      defaultNote = 'Lembur Shift Malam';
    } else {
      // General: lembur mulai setelah 8 jam
      const parsedIn = parseTime(rawIn);
      const otStartH = (parsedIn[0] + normalHours) % 24;
      awalLembur = `${otStartH.toString().padStart(2, '0')}.${parsedIn[1].toString().padStart(2, '0')}`;
    }

    return {
      isScheduledWork: true,
      actualDurationHours,
      overtimeHours,
      awalLembur,
      akhirLembur,
      keterangan: 'Lembur berdasarkan roster (8 jam normal + 4 jam lembur assumption), bukan absensi aktual',
      pemberiTugas: supervisor,
      isIncomplete: false,
    };
  }

  // 6. Operator terjadwal OFF but has explicit checkIn/checkout (backup working)
  // This handles the case where OFF schedule but working - all hours as overtime
  const overtimeHours = actualDuration;

  return {
    isScheduledWork: false,
    actualDurationHours: actualDuration,
    overtimeHours,
    awalLembur: formattedIn,
    akhirLembur: formattedOut,
    keterangan: params.customNote || 'Lembur Backup (working on OFF day)',
    pemberiTugas: supervisor,
    isIncomplete: false,
  };
}
export function calculateDayOvertime(params: CalculateDayOvertimeParams): OvertimeCalculationResult {

}