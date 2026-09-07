import { parseISO, addMinutes, differenceInMinutes } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

export const TIMEZONE_JAKARTA = 'Asia/Jakarta';

/**
 * Returns current Date in Asia/Jakarta timezone
 */
export function getJakartaNow(): Date {
  return toZonedTime(new Date(), TIMEZONE_JAKARTA);
}

/**
 * Formats a Date or date string to YYYY-MM-DD in Asia/Jakarta
 */
export function formatJakartaDate(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatTz(toZonedTime(d, TIMEZONE_JAKARTA), 'yyyy-MM-dd', { timeZone: TIMEZONE_JAKARTA });
}

/**
 * Formats a Date or date string to human-readable Indonesian format
 * Example: "Kamis, 03 September 2026"
 */
export function formatIndonesianDate(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const zoned = toZonedTime(d, TIMEZONE_JAKARTA);
  const dayName = days[zoned.getDay()];
  const day = zoned.getDate().toString().padStart(2, '0');
  const monthName = months[zoned.getMonth()];
  const year = zoned.getFullYear();

  return `${dayName}, ${day} ${monthName} ${year}`;
}

/**
 * Formats time in HH:mm WIB
 */
export function formatJakartaTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatTz(toZonedTime(d, TIMEZONE_JAKARTA), 'HH:mm', { timeZone: TIMEZONE_JAKARTA });
}

/**
 * Computes late minutes given a shift start time (e.g. "06:00") and a checkIn Date.
 * A grace period of 15 minutes is allowed (0-15 mins late = on time).
 * Anything after 15 mins is counted as late with exact late minutes.
 */
export function computeLateMinutes(shiftStartTimeStr: string, checkInDate: Date, shiftDateStr: string): number {
  // Construct shift start DateTime in Jakarta timezone
  const shiftStart = new Date(`${shiftDateStr}T${shiftStartTimeStr.padStart(5, '0')}:00+07:00`);
  
  // Calculate difference in minutes
  const diff = differenceInMinutes(checkInDate, shiftStart);
  
  if (diff > 15) {
    return diff;
  }
  return 0;
}

/**
 * Determines whether current time is within check-in window
 * (starts 60 mins before shift and ends at shift end)
 */
export function isCheckInWindowOpen(shiftStartTime: string, shiftEndTime: string, dateStr: string): boolean {
  const now = new Date();
  const shiftStart = new Date(`${dateStr}T${shiftStartTime}:00+07:00`);
  const windowStart = addMinutes(shiftStart, -60); // 60 mins before shift
  
  // Handle overnight shift end time
  let shiftEnd = new Date(`${dateStr}T${shiftEndTime}:00+07:00`);
  if (shiftEndTime < shiftStartTime) {
    // Overnight (e.g., 22:00 to 06:00 next day)
    shiftEnd = addMinutes(shiftEnd, 24 * 60);
  }

  return now >= windowStart && now <= shiftEnd;
}
