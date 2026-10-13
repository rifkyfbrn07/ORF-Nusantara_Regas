'use client';

import React, { useEffect, useState } from 'react';
import { InfoOrfReportDTO } from '@/lib/infoOrfTypes';
import {
  INFO_ORF_HOURS,
  INFO_ORF_LINE_TEMPLATE,
  INFO_ORF_METRIC_TEMPLATE,
  INFO_ORF_SECTION_LABELS,
} from '@/lib/infoOrfConfig';
import { getPreviousInfoOrfReportAction, saveMonitoringOrfReportAction } from '@/server/actions/infoOrfActions';
import { formatJakartaDate, formatJakartaTime } from '@/lib/time';

interface Props {
  report: InfoOrfReportDTO | null;
  defaultDate: string;
  onCancel: () => void;
  onSaved: (report: InfoOrfReportDTO) => void;
  onDuplicate: (date: string, hour: string) => void;
}

type NumericFields = {
  PRESSURE: string;
  TEMPERATURE: string;
  TOTAL_FLOW: string;
  LNG_FLOW: string;
  ROB_LNG: string;
};

type LineValues = {
  lineCode: string;
  lineName: string;
  flowRate: string;
  volume: string;
  energy: string;
  temperature: string;
  sortOrder: number;
};

type MetricTemplate = (typeof INFO_ORF_METRIC_TEMPLATE)[number];
type ParsedLine = Omit<LineValues, 'flowRate' | 'volume' | 'energy' | 'temperature'> & {
  flowRate: number | null;
  volume: number | null;
  energy: number | null;
  temperature: number | null;
};
type ValidLine = Omit<ParsedLine, 'flowRate' | 'volume' | 'energy' | 'temperature'> & {
  flowRate: number;
  volume: number;
  energy: number;
  temperature: number;
};

function numberValue(text: string): number | null {
  const normalized = text.trim();
  if (!normalized || (normalized.includes(',') && normalized.includes('.')) || (normalized.match(/,/g) || []).length > 1) {
    return null;
  }
  const value = Number(normalized.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function emptyNumbers(): NumericFields {
  return { PRESSURE: '', TEMPERATURE: '', TOTAL_FLOW: '', LNG_FLOW: '', ROB_LNG: '' };
}

function metricsFromReport(report: InfoOrfReportDTO | null): NumericFields {
  const values = emptyNumbers();
  for (const metric of report?.metrics || []) {
    if (metric.key in values) values[metric.key as keyof NumericFields] = String(metric.value);
  }
  return values;
}

function linesFromReport(report: InfoOrfReportDTO | null): LineValues[] {
  if (report) {
    const existing = new Map(report.lines.map((line) => [line.lineCode, line]));
    return INFO_ORF_LINE_TEMPLATE.map((template, index) => {
      const line = existing.get(template.lineCode);
      return {
        lineCode: template.lineCode,
        lineName: template.lineName,
        flowRate: line?.flowRate == null ? '' : String(line.flowRate),
        volume: line?.volume == null ? '' : String(line.volume),
        energy: line?.energy == null ? '' : String(line.energy),
        temperature: line?.temperature == null ? '' : String(line.temperature),
        sortOrder: index,
      };
    });
  }
  return INFO_ORF_LINE_TEMPLATE.map((line, sortOrder) => ({
    ...line,
    flowRate: '',
    volume: '',
    energy: '',
    temperature: '',
    sortOrder,
  }));
}

function reportEta(report: InfoOrfReportDTO | null): string {
  if (!report?.nextCargo) return '';
  const eta = new Date(report.nextCargo.eta);
  return `${formatJakartaDate(eta)}T${formatJakartaTime(eta)}`;
}

function NumberInput({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#5F718A]">{label}</span>
      <span className="flex items-center">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Contoh: 51,76"
          className="w-full min-w-0 rounded-l-lg border border-r-0 border-[#DCE5EF] bg-white px-2.5 py-2 text-sm font-mono focus:outline-none focus:border-[#0077C8]"
        />
        <span className="rounded-r-lg border border-[#DCE5EF] bg-[#F4F8FC] px-2 py-2 text-[10px] font-bold text-[#52708E] whitespace-nowrap">
          {unit}
        </span>
      </span>
    </label>
  );
}

export function MonitoringOrfReportForm({ report, defaultDate, onCancel, onSaved, onDuplicate }: Props) {
  const [reportDate, setReportDate] = useState(report?.reportDate || defaultDate);
  const [reportHour, setReportHour] = useState(report?.reportHour || '08');
  const [metrics, setMetrics] = useState<NumericFields>(() => metricsFromReport(report));
  const [lines, setLines] = useState<LineValues[]>(() => linesFromReport(report));
  const [nextCargoCode, setNextCargoCode] = useState(report?.nextCargo?.cargoCode || '');
  const [nextCargoEta, setNextCargoEta] = useState(() => reportEta(report));
  const [nextCargoId, setNextCargoId] = useState(report?.nextCargo?.id || null);
  const [note, setNote] = useState(report?.note || '');
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(!report);
  const [sourceReport, setSourceReport] = useState<InfoOrfReportDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (report) return;

    let active = true;
    getPreviousInfoOrfReportAction({ reportDate, reportHour })
      .then((result) => {
        if (!active) return;
        if (!result.success) {
          setError(result.error);
          return;
        }
        const previous = result.report;
        setSourceReport(previous);
        setMetrics(metricsFromReport(previous));
        setLines(linesFromReport(previous));
        setNextCargoCode(previous?.nextCargo?.cargoCode || '');
        setNextCargoEta(reportEta(previous));
        setNextCargoId(previous?.nextCargo?.id || null);
        setNote(previous?.note || '');
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Gagal memuat nilai laporan sebelumnya.');
      })
      .finally(() => {
        if (active) setPrefillLoading(false);
      });

    return () => {
      active = false;
    };
  }, [report, reportDate, reportHour]);

  function setMetric(key: keyof NumericFields, value: string) {
    setMetrics((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const metricEntries = INFO_ORF_METRIC_TEMPLATE.map((template, sortOrder) => {
      const value = numberValue(metrics[template.key as keyof NumericFields]);
      return { template, value, sortOrder };
    }).filter((entry): entry is { template: MetricTemplate; value: number; sortOrder: number } => entry.value !== null);
    if (metricEntries.length !== INFO_ORF_METRIC_TEMPLATE.length) {
      const invalidMetric = INFO_ORF_METRIC_TEMPLATE.find((template) => numberValue(metrics[template.key as keyof NumericFields]) === null);
      setError(`Isi ${invalidMetric?.label ?? 'semua metrik'} dengan angka valid dan tidak negatif.`);
      return;
    }

    const parsedLines: ParsedLine[] = lines.map((line) => ({
      ...line,
      flowRate: numberValue(line.flowRate),
      volume: numberValue(line.volume),
      energy: numberValue(line.energy),
      temperature: numberValue(line.temperature),
    }));
    const validLines = parsedLines.filter((line): line is ValidLine =>
      line.flowRate !== null && line.volume !== null && line.energy !== null && line.temperature !== null
    );
    if (validLines.length !== lines.length) {
      const invalidLine = parsedLines.find((line) =>
        line.flowRate === null || line.volume === null || line.energy === null || line.temperature === null
      );
      setError(`Isi Flow, Volume, Energy, dan Temperature dengan angka valid untuk ${invalidLine?.lineName ?? 'setiap line'}.`);
      return;
    }
    if (Boolean(nextCargoCode.trim()) !== Boolean(nextCargoEta)) {
      setError('Kode cargo dan ETA harus diisi bersamaan.');
      return;
    }

    setLoading(true);
    try {
      const result = await saveMonitoringOrfReportAction({
        id: report?.id,
        reportDate,
        reportHour,
        note: note.trim() || null,
        nextCargoId,
        nextCargoCode: nextCargoCode.trim() || null,
        nextCargoEta: nextCargoEta ? `${nextCargoEta}:00+07:00` : null,
        metrics: metricEntries.map(({ template, value, sortOrder }) => ({
          section: template.section,
          key: template.key,
          label: template.label,
          value,
          unit: template.unit,
          sortOrder,
        })),
        lines: validLines.map((line) => ({
          lineCode: line.lineCode,
          lineName: line.lineName,
          flowRate: line.flowRate,
          volume: line.volume,
          energy: line.energy,
          temperature: line.temperature,
          flowUnit: 'MMSCFD',
          volumeUnit: 'Mscf/h',
          energyUnit: 'Mmbtu/h',
          temperatureUnit: 'Deg F',
          sortOrder: line.sortOrder,
        })),
      });

      if (!result.success) {
        setError(result.error);
        if (result.code === 'DUPLICATE_REPORT') onDuplicate(reportDate, reportHour);
        return;
      }
      setSuccess(true);
      onSaved(result.report);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan laporan Monitoring ORF.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-[#DCE5EF] bg-white px-2.5 py-2 text-xs focus:outline-none focus:border-[#0077C8] disabled:bg-slate-50 disabled:text-slate-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Laporan berhasil disimpan.</p>}

      <section className="grid grid-cols-1 gap-3 rounded-xl border border-[#DCE5EF] bg-white p-4 sm:grid-cols-2">
        <label className="text-[10px] font-bold uppercase tracking-wide text-[#5F718A]">
          Tanggal laporan (WIB)
          <input type="date" required disabled={!!report} value={reportDate} onChange={(event) => { setPrefillLoading(true); setError(null); setReportDate(event.target.value); }} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wide text-[#5F718A]">
          Jam laporan (WIB)
          <select required disabled={!!report} value={reportHour} onChange={(event) => { setPrefillLoading(true); setError(null); setReportHour(event.target.value); }} className={`${inputClass} mt-1`}>
            {INFO_ORF_HOURS.map((hour) => <option key={hour} value={hour}>{hour}:00 WIB</option>)}
          </select>
        </label>
        {report && <p className="sm:col-span-2 text-[11px] text-[#5F718A]">Saat mengoreksi, tanggal dan jam pencatatan tidak dapat diubah.</p>}
      </section>

      {!report && (
        <p role={error ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-[11px] font-semibold ${
          error ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#DCE5EF] bg-[#F7FAFD] text-[#52677F]'
        }`}>
          {prefillLoading
            ? 'Memuat nilai awal dari laporan terakhir sebelum waktu yang dipilih…'
            : sourceReport
              ? `Nilai awal dari laporan ${sourceReport.reportDate} pukul ${sourceReport.reportHour}:00 WIB. Perubahan hanya tersimpan setelah tombol Simpan Laporan ditekan.`
              : 'Belum ada laporan sebelumnya pada waktu ini. Form menggunakan nilai kosong; data laporan yang lebih baru tidak digunakan.'}
        </p>
      )}

      <fieldset disabled={loading || prefillLoading} className="space-y-5 disabled:opacity-70">
      <section className="rounded-xl border border-[#DCE5EF] bg-white p-4">
        <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-[#092B57]">{INFO_ORF_SECTION_LABELS.UPSTREAM}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NumberInput label="Pressure" value={metrics.PRESSURE} unit="Barg" onChange={(value) => setMetric('PRESSURE', value)} />
          <NumberInput label="Temperature" value={metrics.TEMPERATURE} unit="Deg F" onChange={(value) => setMetric('TEMPERATURE', value)} />
        </div>
      </section>

      <section className="rounded-xl border border-[#DCE5EF] bg-white p-4">
        <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-[#092B57]">Penyaluran Gas</h3>
        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={line.lineCode} className="rounded-lg border border-[#EDF2F7] bg-[#FAFCFE] p-3">
              <h4 className="mb-2 text-[11px] font-bold text-[#123D70]">{line.lineName}</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <NumberInput label="Flow" value={line.flowRate} unit="MMSCFD" onChange={(value) => setLines((old) => old.map((item, i) => i === index ? { ...item, flowRate: value } : item))} />
                <NumberInput label="Volume" value={line.volume} unit="Mscf/h" onChange={(value) => setLines((old) => old.map((item, i) => i === index ? { ...item, volume: value } : item))} />
                <NumberInput label="Energy" value={line.energy} unit="Mmbtu/h" onChange={(value) => setLines((old) => old.map((item, i) => i === index ? { ...item, energy: value } : item))} />
                <NumberInput label="Temperature" value={line.temperature} unit="Deg F" onChange={(value) => setLines((old) => old.map((item, i) => i === index ? { ...item, temperature: value } : item))} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#DCE5EF] bg-white p-4">
          <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-[#092B57]">{INFO_ORF_SECTION_LABELS.TOTAL}</h3>
          <NumberInput label="Total MK + TP + MTW" value={metrics.TOTAL_FLOW} unit="MMscfd" onChange={(value) => setMetric('TOTAL_FLOW', value)} />
        </div>
        <div className="rounded-xl border border-[#DCE5EF] bg-white p-4">
          <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-[#092B57]">{INFO_ORF_SECTION_LABELS.FSRU}</h3>
          <div className="space-y-3">
            <NumberInput label="LNG Flow" value={metrics.LNG_FLOW} unit="M3/H" onChange={(value) => setMetric('LNG_FLOW', value)} />
            <NumberInput label="ROB LNG" value={metrics.ROB_LNG} unit="M3" onChange={(value) => setMetric('ROB_LNG', value)} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 rounded-xl border border-[#DCE5EF] bg-white p-4 sm:grid-cols-2">
        <label className="text-[10px] font-bold uppercase tracking-wide text-[#5F718A]">
          ETA Next Cargo (WIB)
          <input type="datetime-local" value={nextCargoEta} onChange={(event) => { setNextCargoEta(event.target.value); setNextCargoId(null); }} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wide text-[#5F718A]">
          Kode Next Cargo (opsional)
          <input value={nextCargoCode} onChange={(event) => { setNextCargoCode(event.target.value); setNextCargoId(null); }} maxLength={60} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wide text-[#5F718A] sm:col-span-2">
          Catatan (opsional)
          <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={`${inputClass} mt-1`} />
        </label>
      </section>

      </fieldset>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={loading} className="rounded-lg border border-[#DCE5EF] px-4 py-2 text-xs font-bold text-[#52677F] hover:bg-[#F4F8FC] disabled:opacity-50">
          Batal
        </button>
        <button type="submit" disabled={loading || prefillLoading} className="rounded-lg bg-[#0066B3] px-4 py-2 text-xs font-bold text-white hover:bg-[#005091] disabled:opacity-50">
          {loading ? 'Menyimpan…' : report ? 'Simpan Perubahan' : 'Simpan Laporan Baru'}
        </button>
      </div>
    </form>
  );
}
