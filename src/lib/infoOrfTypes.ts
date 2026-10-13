// ============================================================================
// TIPE DTO INFO ORF — dibagikan antara server service dan client components
// (selalu serializable: angka sudah dikonversi, DateTime sudah jadi ISO string).
// ============================================================================

export type InfoOrfSection = 'UPSTREAM' | 'TOTAL' | 'FSRU';
export type NextCargoStatus = 'SCHEDULED' | 'DISCHARGING' | 'COMPLETED' | 'CANCELLED';
export type InfoOrfReportSource = 'MANUAL' | 'AUTOMATIC';

export interface InfoOrfMetricDTO {
  id: string;
  section: InfoOrfSection;
  key: string;
  label: string;
  value: number;
  unit: string;
  sortOrder: number;
}

export interface InfoOrfLineDTO {
  id: string;
  lineCode: string;
  lineName: string;
  flowRate: number | null;
  volume: number | null;
  energy: number | null;
  temperature: number | null;
  flowUnit: string;
  volumeUnit: string;
  energyUnit: string;
  temperatureUnit: string;
  sortOrder: number;
}

export interface NextCargoDTO {
  id: string;
  eta: string; // ISO (WIB)
  cargoCode: string;
  vesselName: string | null;
  volumeLng: number | null;
  status: NextCargoStatus;
  note: string | null;
  lastUpdatedBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface InfoOrfReportDTO {
  id: string;
  reportDate: string;
  reportHour: string;
  reportTime: string; // ISO (WIB)
  source: InfoOrfReportSource;
  wasEdited: boolean;
  note: string | null;
  recordedBy: { id: string; name: string; position: string };
  metrics: InfoOrfMetricDTO[];
  lines: InfoOrfLineDTO[];
  nextCargo: NextCargoDTO | null;
  createdAt: string;
  updatedAt: string;
}

export interface InfoOrfDashboardDTO {
  latest: InfoOrfReportDTO | null;
  nextCargo: NextCargoDTO | null;
  availableDates: { date: string; count: number }[];
  reportsForSelectedDate: InfoOrfReportDTO[];
  selectedDate: string;
  totalReports: number;
  schedulerLastRun: {
    action: string;
    metadata: string | null;
    createdAt: string;
  } | null;
}
