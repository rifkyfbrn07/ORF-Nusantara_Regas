// ============================================================================
// SERVICE INFO ORF — DATA OPERASIONAL PER JAM (WIB)
// ----------------------------------------------------------------------------
// Aturan domain:
//   - Satu TANGGAL boleh memiliki BANYAK laporan (satu per jam pencatatan).
//   - (reportDate, reportHour) UNIK → mencegah duplikasi periode.
//   - Menambah laporan baru TIDAK menimpa laporan lama (create-only; edit
//     dilakukan lewat updateInfoOrfReport pada periode yang sama).
//   - Nilai metrik/line disimpan apa adanya (Decimal + satuan), TIDAK
//     dijumlahkan lintas jam.
//   - NextCargo adalah entitas terpisah dengan mekanisme pembaruannya sendiri.
// ============================================================================

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { recordAuditLog } from './auditService';
import { toNumber } from '@/lib/infoOrfConfig';

export interface InfoOrfMetricInput {
  section: 'UPSTREAM' | 'TOTAL' | 'FSRU';
  key: string;
  label: string;
  value: number;
  unit: string;
  sortOrder: number;
}

export interface InfoOrfLineInput {
  lineCode: string;
  lineName: string;
  flowRate?: number | null;
  volume?: number | null;
  energy?: number | null;
  temperature?: number | null;
  flowUnit: string;
  volumeUnit: string;
  energyUnit: string;
  temperatureUnit: string;
  sortOrder: number;
}

export interface InfoOrfReportInput {
  reportDate: string;
  reportHour: string;
  note?: string | null;
  nextCargoId?: string | null;
  nextCargo?: { cargoCode: string; eta: Date };
  metrics: InfoOrfMetricInput[];
  lines: InfoOrfLineInput[];
}

export interface NextCargoInput {
  id?: string | null;
  eta: Date;
  cargoCode: string;
  vesselName?: string | null;
  volumeLng?: number | null;
  status: 'SCHEDULED' | 'DISCHARGING' | 'COMPLETED' | 'CANCELLED';
  note?: string | null;
}

/** Timestamp WIB (date + hour) — dasar sortir kronologis antar laporan. */
export function buildReportTime(reportDate: string, reportHour: string): Date {
  return new Date(`${reportDate}T${reportHour.padStart(2, '0')}:00:00+07:00`);
}

const REPORT_INCLUDE = {
  recordedBy: { select: { id: true, name: true, position: true } },
  metrics: { orderBy: { sortOrder: 'asc' as const } },
  lines: { orderBy: { sortOrder: 'asc' as const } },
  nextCargo: {
    include: {
      lastUpdatedBy: { select: { id: true, name: true } },
    },
  },
};

type ReportRow = Prisma.InfoOrfReportGetPayload<{ include: typeof REPORT_INCLUDE }>;

function serializeReport(r: ReportRow) {
  return {
    id: r.id,
    reportDate: r.reportDate,
    reportHour: r.reportHour,
    reportTime: r.reportTime.toISOString(),
    note: r.note,
    recordedBy: r.recordedBy,
    metrics: r.metrics.map((m) => ({
      id: m.id,
      section: m.section,
      key: m.key,
      label: m.label,
      value: toNumber(m.value),
      unit: m.unit,
      sortOrder: m.sortOrder,
    })),
    lines: r.lines.map((l) => ({
      id: l.id,
      lineCode: l.lineCode,
      lineName: l.lineName,
      flowRate: l.flowRate === null ? null : toNumber(l.flowRate),
      volume: l.volume === null ? null : toNumber(l.volume),
      energy: l.energy === null ? null : toNumber(l.energy),
      temperature: l.temperature === null ? null : toNumber(l.temperature),
      flowUnit: l.flowUnit,
      volumeUnit: l.volumeUnit,
      energyUnit: l.energyUnit,
      temperatureUnit: l.temperatureUnit,
      sortOrder: l.sortOrder,
    })),
    nextCargo: r.nextCargo ? serializeNextCargo(r.nextCargo) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function serializeNextCargo(c: Prisma.NextCargoGetPayload<{ include: { lastUpdatedBy: { select: { id: true; name: true } } } }>) {
  return {
    id: c.id,
    eta: c.eta.toISOString(),
    cargoCode: c.cargoCode,
    vesselName: c.vesselName,
    volumeLng: c.volumeLng === null ? null : toNumber(c.volumeLng),
    status: c.status,
    note: c.note,
    lastUpdatedBy: c.lastUpdatedBy,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export class InfoOrfDuplicateError extends Error {
  constructor() {
    super('DUPLICATE_REPORT');
    this.name = 'InfoOrfDuplicateError';
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function createInfoOrfReport(input: InfoOrfReportInput & { recordedById: string }) {
  const { reportDate, reportHour, note, nextCargoId, nextCargo, metrics, lines, recordedById } = input;
  const reportTime = buildReportTime(reportDate, reportHour);

  const existing = await prisma.infoOrfReport.findUnique({
    where: { reportDate_reportHour: { reportDate, reportHour } },
    select: { id: true },
  });
  if (existing) throw new InfoOrfDuplicateError();

  try {
    return await prisma.$transaction(async (tx) => {
      const nextCargoSnapshot = nextCargo
        ? await tx.nextCargo.create({
            data: {
              cargoCode: nextCargo.cargoCode,
              eta: nextCargo.eta,
              status: 'SCHEDULED',
              lastUpdatedById: recordedById,
            },
            select: { id: true },
          })
        : null;
      const report = await tx.infoOrfReport.create({
        data: {
          reportDate,
          reportHour,
          reportTime,
          note: note ?? null,
          recordedById,
          nextCargoId: nextCargoSnapshot?.id ?? nextCargoId ?? null,
          metrics: {
            create: metrics.map((m, i) => ({
              section: m.section,
              key: m.key,
              label: m.label,
              value: new Prisma.Decimal(m.value),
              unit: m.unit,
              sortOrder: m.sortOrder ?? i,
            })),
          },
          lines: {
            create: lines.map((l, i) => ({
              lineCode: l.lineCode,
              lineName: l.lineName,
              flowRate: l.flowRate == null ? null : new Prisma.Decimal(l.flowRate),
              volume: l.volume == null ? null : new Prisma.Decimal(l.volume),
              energy: l.energy == null ? null : new Prisma.Decimal(l.energy),
              temperature: l.temperature == null ? null : new Prisma.Decimal(l.temperature),
              flowUnit: l.flowUnit,
              volumeUnit: l.volumeUnit,
              energyUnit: l.energyUnit,
              temperatureUnit: l.temperatureUnit,
              sortOrder: l.sortOrder ?? i,
            })),
          },
        },
        include: REPORT_INCLUDE,
      });

      await recordAuditLog(
        {
          userId: recordedById,
          action: 'CREATE',
          entity: 'InfoOrfReport',
          entityId: report.id,
          metadata: { reportDate, reportHour, metricCount: metrics.length, lineCount: lines.length },
        },
        tx
      );
      return serializeReport(report);
    });
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) throw new InfoOrfDuplicateError();
    throw error;
  }
}

export async function updateInfoOrfReport(input: InfoOrfReportInput & { id: string; updatedById: string }) {
  const { id, reportDate, reportHour, note, nextCargoId, nextCargo, metrics, lines, updatedById } = input;
  const reportTime = buildReportTime(reportDate, reportHour);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.infoOrfReport.findUnique({
      where: { id },
      select: { id: true, reportDate: true, reportHour: true },
    });
    if (!existing) throw new Error('Laporan tidak ditemukan.');
    if (existing.reportDate !== reportDate || existing.reportHour !== reportHour) {
      throw new Error('Tanggal dan jam pencatatan tidak dapat diubah saat mengoreksi laporan.');
    }

    const nextCargoSnapshot = nextCargo
      ? await tx.nextCargo.create({
          data: {
            cargoCode: nextCargo.cargoCode,
            eta: nextCargo.eta,
            status: 'SCHEDULED',
            lastUpdatedById: updatedById,
          },
          select: { id: true },
        })
      : null;

    const report = await tx.infoOrfReport.update({
      where: { id },
      data: {
        reportDate,
        reportHour,
        reportTime,
        note: note ?? null,
        nextCargoId: nextCargoSnapshot?.id ?? (nextCargo ? null : nextCargoId || null),
        metrics: {
          deleteMany: {},
          create: metrics.map((m, i) => ({
            section: m.section,
            key: m.key,
            label: m.label,
            value: new Prisma.Decimal(m.value),
            unit: m.unit,
            sortOrder: m.sortOrder ?? i,
          })),
        },
        lines: {
          deleteMany: {},
          create: lines.map((l, i) => ({
            lineCode: l.lineCode,
            lineName: l.lineName,
            flowRate: l.flowRate == null ? null : new Prisma.Decimal(l.flowRate),
            volume: l.volume == null ? null : new Prisma.Decimal(l.volume),
            energy: l.energy == null ? null : new Prisma.Decimal(l.energy),
            temperature: l.temperature == null ? null : new Prisma.Decimal(l.temperature),
            flowUnit: l.flowUnit,
            volumeUnit: l.volumeUnit,
            energyUnit: l.energyUnit,
            temperatureUnit: l.temperatureUnit,
            sortOrder: l.sortOrder ?? i,
          })),
        },
      },
      include: REPORT_INCLUDE,
    });

    await recordAuditLog(
      {
        userId: updatedById,
        action: 'UPDATE',
        entity: 'InfoOrfReport',
        entityId: report.id,
        metadata: { reportDate, reportHour, metricCount: metrics.length, lineCount: lines.length },
      },
      tx
    );

    return serializeReport(report);
  });
}

export async function getInfoOrfReport(id: string) {
  const report = await prisma.infoOrfReport.findUnique({ where: { id }, include: REPORT_INCLUDE });
  return report ? serializeReport(report) : null;
}

export async function getInfoOrfReportByDateTime(reportDate: string, reportHour: string) {
  const report = await prisma.infoOrfReport.findUnique({
    where: { reportDate_reportHour: { reportDate, reportHour } },
    include: REPORT_INCLUDE,
  });
  return report ? serializeReport(report) : null;
}

export async function getInfoOrfReportsForDate(reportDate: string) {
  const reports = await prisma.infoOrfReport.findMany({
    where: { reportDate },
    include: REPORT_INCLUDE,
    orderBy: { reportTime: 'asc' },
  });
  return reports.map(serializeReport);
}

export async function getInfoOrfReportsInRange(input: {
  startDate: string;
  endDate: string;
  startHour: string;
  endHour: string;
}) {
  const rows = await prisma.infoOrfReport.findMany({
    where: {
      reportDate: { gte: input.startDate, lte: input.endDate },
      reportHour: { gte: input.startHour, lte: input.endHour },
    },
    include: REPORT_INCLUDE,
    orderBy: [{ reportDate: 'asc' }, { reportTime: 'asc' }],
    take: 2_200,
  });
  return rows.map(serializeReport);
}

/** Daftar tanggal yang memiliki laporan (terbaru dulu), terbatas. */
export async function getInfoOrfAvailableDates(limit = 60) {
  const groups = await prisma.infoOrfReport.groupBy({
    by: ['reportDate'],
    _count: { _all: true },
    orderBy: { reportDate: 'desc' },
    take: limit,
  });
  return groups.map((g) => ({ date: g.reportDate, count: g._count._all }));
}

/** Next Cargo yang aktif (belum selesai/batal) — kandidat ETA terdekat. */
export async function getNextCargoActive() {
  const cargo = await prisma.nextCargo.findFirst({
    where: { status: { in: ['SCHEDULED', 'DISCHARGING'] } },
    orderBy: [{ eta: 'asc' }, { createdAt: 'desc' }],
    include: { lastUpdatedBy: { select: { id: true, name: true } } },
  });
  return cargo ? serializeNextCargo(cargo) : null;
}

export async function upsertNextCargo(input: NextCargoInput & { lastUpdatedById: string }) {
  const { id, eta, cargoCode, vesselName, volumeLng, status, note, lastUpdatedById } = input;

  const result = await prisma.$transaction(async (tx) => {
    const saved = id
      ? await tx.nextCargo.update({
          where: { id },
          data: {
            eta,
            cargoCode,
            vesselName: vesselName ?? null,
            volumeLng: volumeLng == null ? null : new Prisma.Decimal(volumeLng),
            status,
            note: note ?? null,
            lastUpdatedById,
          },
          include: { lastUpdatedBy: { select: { id: true, name: true } } },
        })
      : await tx.nextCargo.create({
          data: {
            eta,
            cargoCode,
            vesselName: vesselName ?? null,
            volumeLng: volumeLng == null ? null : new Prisma.Decimal(volumeLng),
            status,
            note: note ?? null,
            lastUpdatedById,
          },
          include: { lastUpdatedBy: { select: { id: true, name: true } } },
        });

    await recordAuditLog(
      {
        userId: lastUpdatedById,
        action: id ? 'UPDATE' : 'CREATE',
        entity: 'NextCargo',
        entityId: saved.id,
        metadata: { cargoCode, eta: eta.toISOString(), status },
      },
      tx
    );

    return saved;
  });

  return serializeNextCargo(result);
}

export interface InfoOrfDashboardData {
  latest: ReturnType<typeof serializeReport> | null;
  nextCargo: ReturnType<typeof serializeNextCargo> | null;
  availableDates: { date: string; count: number }[];
  reportsForSelectedDate: ReturnType<typeof serializeReport>[];
  selectedDate: string;
  totalReports: number;
}

/** Data utama halaman Info ORF (server component). */
export async function getInfoOrfDashboard(selectedDate?: string): Promise<InfoOrfDashboardData> {
  const [latest, nextCargo, availableDates, totalReports] = await Promise.all([
    prisma.infoOrfReport.findFirst({ orderBy: { reportTime: 'desc' }, include: REPORT_INCLUDE }),
    getNextCargoActive(),
    getInfoOrfAvailableDates(),
    prisma.infoOrfReport.count(),
  ]);

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const resolvedDate = selectedDate || latest?.reportDate || todayStr;

  const reportsForSelectedDate = await getInfoOrfReportsForDate(resolvedDate);

  return {
    latest: latest ? serializeReport(latest) : null,
    nextCargo,
    availableDates,
    reportsForSelectedDate,
    selectedDate: resolvedDate,
    totalReports,
  };
}

/** Ringkasan ringan untuk widget dashboard (tanpa include berat). */
export async function getLatestInfoOrfSummary() {
  const latest = await prisma.infoOrfReport.findFirst({
    orderBy: { reportTime: 'desc' },
    include: {
      metrics: {
        orderBy: { sortOrder: 'asc' },
        select: { section: true, key: true, label: true, value: true, unit: true },
      },
      lines: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
        select: { lineName: true, flowRate: true, flowUnit: true },
      },
    },
  });
  if (!latest) return null;
  return {
    id: latest.id,
    reportDate: latest.reportDate,
    reportHour: latest.reportHour,
    reportTime: latest.reportTime.toISOString(),
    updatedAt: latest.updatedAt.toISOString(),
    totalFlow: (() => {
      const metric = latest.metrics.find((m) => m.section === 'TOTAL' && m.key === 'TOTAL_FLOW');
      return metric ? { label: metric.label, value: toNumber(metric.value), unit: metric.unit } : null;
    })(),
    lineFlow: latest.lines[0] ? {
      lineName: latest.lines[0].lineName,
      value: latest.lines[0].flowRate === null ? null : toNumber(latest.lines[0].flowRate),
      unit: latest.lines[0].flowUnit,
    } : null,
    metrics: latest.metrics.map((m) => ({
      section: m.section,
      key: m.key,
      label: m.label,
      value: toNumber(m.value),
      unit: m.unit,
    })),
  };
}
