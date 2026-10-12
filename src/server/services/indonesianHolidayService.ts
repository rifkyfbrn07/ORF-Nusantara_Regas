const HOLIDAY_CALENDAR_URL =
  'https://raw.githubusercontent.com/guangrei/APIHariLibur_V2/main/calendar.json';

export interface IndonesianHolidayCalendar {
  holidays: Record<string, string>;
  error: string | null;
}

type HolidayEntry = {
  holiday?: unknown;
  summary?: unknown;
};

export async function getIndonesianHolidayCalendar(year: number): Promise<IndonesianHolidayCalendar> {
  try {
    const response = await fetch(HOLIDAY_CALENDAR_URL, { next: { revalidate: 86400 } });
    if (!response.ok) {
      throw new Error(`Kalender libur nasional tidak tersedia (HTTP ${response.status}).`);
    }

    const calendar: unknown = await response.json();
    if (!calendar || typeof calendar !== 'object' || Array.isArray(calendar)) {
      throw new Error('Format kalender libur nasional tidak valid.');
    }

    const holidays: Record<string, string> = {};
    for (const [date, rawEntry] of Object.entries(calendar)) {
      if (!date.startsWith(`${year}-`) || !rawEntry || typeof rawEntry !== 'object') continue;
      const entry = rawEntry as HolidayEntry;
      if (entry.holiday !== true) continue;
      const summary = Array.isArray(entry.summary)
        ? entry.summary.find((value): value is string => typeof value === 'string')
        : null;
      holidays[date] = summary ?? 'Hari libur nasional';
    }

    if (Object.keys(holidays).length === 0) {
      throw new Error(`Kalender libur nasional belum memuat data untuk ${year}.`);
    }

    return { holidays, error: null };
  } catch (error) {
    console.error('Gagal mengambil kalender libur nasional Indonesia:', error);
    return {
      holidays: {},
      error: error instanceof Error ? error.message : 'Kalender libur nasional gagal dimuat.',
    };
  }
}
