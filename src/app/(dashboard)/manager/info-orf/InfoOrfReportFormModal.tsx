'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { InfoOrfReportDTO, NextCargoDTO, InfoOrfSection } from '@/lib/infoOrfTypes';
import {
  INFO_ORF_METRIC_TEMPLATE,
  INFO_ORF_LINE_TEMPLATE,
  INFO_ORF_HOURS,
  INFO_ORF_ALLOWED_UNITS,
  INFO_ORF_SECTION_LABELS,
} from '@/lib/infoOrfConfig';
import { createInfoOrfReportAction, updateInfoOrfReportAction } from '@/server/actions/infoOrfActions';

interface MetricRow {
  section: InfoOrfSection;
  key: string;
  label: string;
  value: string;
  unit: string;
  sortOrder: number;
}

interface LineRow {
  lineCode: string;
  lineName: string;
  flowRate: string;
  flowUnit: string;
  volume: string;
  volumeUnit: string;
  energy: string;
  energyUnit: string;
  temperature: string;
  temperatureUnit: string;
  sortOrder: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  report: InfoOrfReportDTO | null; // null = buat baru
  defaultDate: string;
  nextCargo: NextCargoDTO | null;
  onSaved: (saved: InfoOrfReportDTO) => void;
}

function numberOrNull(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function metricTemplateRows() {
  return INFO_ORF_METRIC_TEMPLATE.map((t, i) => ({ section: t.section, key: t.key, label: t.label, value: '', unit: t.unit, sortOrder: i }));
}

function lineTemplateRows() {
  return INFO_ORF_LINE_TEMPLATE.map((t, i) => ({
    lineCode: t.lineCode,
    lineName: t.lineName,
    flowRate: '',
    flowUnit: 'MMSCFD',
    volume: '',
    volumeUnit: 'm³',
    energy: '',
    energyUnit: 'MMBTU',
    temperature: '',
    temperatureUnit: '°F',
    sortOrder: i,
  }));
}

function metricRowsFromReport(report: InfoOrfReportDTO): MetricRow[] {
  return report.metrics.map((m) => ({ section: m.section, key: m.key, label: m.label, value: String(m.value), unit: m.unit, sortOrder: m.sortOrder }));
}

function lineRowsFromReport(report: InfoOrfReportDTO): LineRow[] {
  return report.lines.map((l) => ({
    lineCode: l.lineCode,
    lineName: l.lineName,
    flowRate: l.flowRate != null ? String(l.flowRate) : '',
    flowUnit: l.flowUnit,
    volume: l.volume != null ? String(l.volume) : '',
    volumeUnit: l.volumeUnit,
    energy: l.energy != null ? String(l.energy) : '',
    energyUnit: l.energyUnit,
    temperature: l.temperature != null ? String(l.temperature) : '',
    temperatureUnit: l.temperatureUnit,
    sortOrder: l.sortOrder,
  }));
}

export function InfoOrfReportFormModal({ open, onClose, report, defaultDate, nextCargo, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reportDate, setReportDate] = useState(defaultDate);
  const [reportHour, setReportHour] = useState(report?.reportHour || '08');
  const [note, setNote] = useState(report?.note || '');
  const [nextCargoId, setNextCargoId] = useState(report?.nextCargo?.id || nextCargo?.id || '');
  const [metrics, setMetrics] = useState<MetricRow[]>(report ? metricRowsFromReport(report) : metricTemplateRows());
  const [lines, setLines] = useState<LineRow[]>(report ? lineRowsFromReport(report) : lineTemplateRows());

  function updateMetric(i: number, patch: Partial<MetricRow>) {
    setMetrics((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  function updateLine(i: number, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function addMetric(section: InfoOrfSection) {
    setMetrics((prev) => [...prev, { section, key: `CUSTOM_${prev.length + 1}`, label: '', value: '', unit: 'MMSCFD', sortOrder: prev.length }]);
  }

  function addLine() {
      setLines((prev) => [
        ...prev,
        {
          lineCode: `LINE-${String(prev.length + 1).padStart(2, '0')}`,
          lineName: '',
          flowRate: '',
          flowUnit: 'MMSCFD',
          volume: '',
          volumeUnit: 'm³',
          energy: '',
          energyUnit: 'MMBTU',
          temperature: '',
          temperatureUnit: '°F',
          sortOrder: prev.length,
        },
      ]);
  }

  async function handleSubmit() {
    setError(null);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      setError('Format tanggal harus YYYY-MM-DD.');
      return;
    }
    if (!/^([01]\d|2[0-3])$/.test(reportHour)) {
      setError('Jam pencatatan harus antara 00–23.');
      return;
    }

    const parsedMetrics: { section: InfoOrfSection; key: string; label: string; value: number; unit: string; sortOrder: number }[] = [];
    for (const m of metrics) {
      if (!m.label.trim()) {
        setError('Setiap metrik harus memiliki label.');
        return;
      }
      const num = numberOrNull(m.value);
      if (num === null || num < 0) {
        setError(`Nilai metrik "${m.label}" harus berupa angka valid (≥ 0).`);
        return;
      }
      if (!m.unit.trim()) {
        setError(`Satuan metrik "${m.label}" wajib diisi.`);
        return;
      }
      parsedMetrics.push({ section: m.section, key: m.key || `CUSTOM_${m.sortOrder}`, label: m.label.trim(), value: num, unit: m.unit.trim(), sortOrder: m.sortOrder });
    }
    if (parsedMetrics.length === 0) {
      setError('Minimal satu data metrik harus diisi.');
      return;
    }
    for (const section of ['UPSTREAM', 'TOTAL', 'FSRU'] as const) {
      if (!parsedMetrics.some((metric) => metric.section === section)) {
        setError(`Minimal satu metrik untuk bagian ${INFO_ORF_SECTION_LABELS[section]} wajib diisi.`);
        return;
      }
    }

    const parsedLines: {
      lineCode: string;
      lineName: string;
      flowRate: number | null;
      flowUnit: string;
      volume: number | null;
      volumeUnit: string;
      energy: number | null;
      energyUnit: string;
      temperature: number | null;
      temperatureUnit: string;
      sortOrder: number;
    }[] = [];
    for (const l of lines) {
      if (!l.lineCode.trim() || !l.lineName.trim()) {
        setError('Kode dan nama line penyaluran wajib diisi.');
        return;
      }
      const flowRate = numberOrNull(l.flowRate);
      const volume = numberOrNull(l.volume);
      const energy = numberOrNull(l.energy);
      const temperature = numberOrNull(l.temperature);
      if ((l.flowRate.trim() !== '' && flowRate === null) || (l.volume.trim() !== '' && volume === null) || (l.energy.trim() !== '' && energy === null) || (l.temperature.trim() !== '' && temperature === null)) {
        setError(`Data line "${l.lineName}" harus berupa angka valid.`);
        return;
      }
      if ([flowRate, volume, energy, temperature].some((value) => value != null && value < 0)) {
        setError(`Nilai line "${l.lineName}" tidak boleh negatif.`);
        return;
      }
      if (!l.flowUnit.trim() || !l.volumeUnit.trim() || !l.energyUnit.trim()) {
        setError(`Satuan flow, volume, dan energy wajib diisi untuk line "${l.lineName}".`);
        return;
      }
      if (flowRate == null && volume == null && energy == null) {
        setError(`Isi minimal satu nilai flow, volume, atau energy untuk line "${l.lineName}".`);
        return;
      }
      parsedLines.push({
        lineCode: l.lineCode.trim(),
        lineName: l.lineName.trim(),
        flowRate,
        flowUnit: l.flowUnit.trim(),
        volume,
        volumeUnit: l.volumeUnit.trim(),
        energy,
        energyUnit: l.energyUnit.trim(),
        temperature,
        temperatureUnit: l.temperatureUnit.trim(),
        sortOrder: l.sortOrder,
      });
    }
    if (parsedLines.length === 0) {
      setError('Minimal satu line penyaluran harus diisi.');
      return;
    }

    setLoading(true);
    const payload = { reportDate, reportHour, note: note.trim() || null, nextCargoId: nextCargoId || null, metrics: parsedMetrics, lines: parsedLines };

    let result: Awaited<ReturnType<typeof createInfoOrfReportAction>>;
    try {
      result = report
        ? await updateInfoOrfReportAction({ ...payload, id: report.id })
        : await createInfoOrfReportAction(payload);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Gagal menyimpan laporan.');
      setLoading(false);
      return;
    }
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Gagal menyimpan laporan.');
      return;
    }

    onSaved(result.report);
  }

  const sectionKeys: InfoOrfSection[] = ['UPSTREAM', 'TOTAL', 'FSRU'];
  const inputCls = 'w-full rounded-lg border border-[#DCE5EF] bg-white px-2.5 py-2 text-xs focus:outline-none focus:border-[#0077C8]';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={report ? `Edit Laporan ${report.reportHour}:00 WIB` : 'Tambah Laporan Info ORF'}
      eyebrow="PENCATATAN PER JAM (WIB)"
      size="2xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#DCE5EF] px-4 py-2 text-xs font-bold text-[#5F718A] hover:bg-[#F4F9FC] transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0077C8] px-4 py-2 text-xs font-bold text-white hover:bg-[#005B9E] transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Menyimpan…' : report ? 'Simpan Perubahan' : 'Simpan Laporan'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-700">
            {error}
          </div>
        )}

        {/* Periode pencatatan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#5F718A]">Tanggal Laporan</label>
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} disabled={!!report} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#5F718A]">Jam Pencatatan (WIB)</label>
            <select value={reportHour} onChange={(e) => setReportHour(e.target.value)} disabled={!!report} className={inputCls}>
              {INFO_ORF_HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}:00 WIB
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Next Cargo tautan (opsional) */}
        {nextCargo && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#5F718A]">Tautkan Next Cargo (opsional)</label>
            <select value={nextCargoId} onChange={(e) => setNextCargoId(e.target.value)} className={inputCls}>
              <option value="">— Tidak ada —</option>
              <option value={nextCargo.id}>
                {nextCargo.cargoCode} • ETA {new Date(nextCargo.eta).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', timeZone: 'Asia/Jakarta' })} {new Date(nextCargo.eta).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
              </option>
            </select>
          </div>
        )}

        {/* Metrik per section */}
        {sectionKeys.map((section) => {
          const sectionMetrics = metrics.filter((m) => m.section === section);
          return (
            <div key={section} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-wider text-[#0077C8]">{INFO_ORF_SECTION_LABELS[section]}</p>
                <button
                  type="button"
                  onClick={() => addMetric(section)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#DCE5EF] bg-white px-2 py-1 text-[10px] font-bold text-[#0077C8] hover:bg-[#EDF4FB] transition cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Tambah
                </button>
              </div>
              <div className="mt-2.5 space-y-2">
                {sectionMetrics.length === 0 && <p className="text-[11px] text-[#8A9DB4]">Belum ada metrik untuk bagian ini.</p>}
                {sectionMetrics.map((m, i) => {
                  const globalIdx = metrics.findIndex((x) => x === m);
                  return (
                    <div key={`${section}-${m.sortOrder}-${i}`} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        value={m.label}
                        onChange={(e) => updateMetric(globalIdx, { label: e.target.value })}
                        placeholder="Label (mis. Total Penyaluran Gas)"
                        className={`${inputCls} col-span-12 sm:col-span-5`}
                      />
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={m.value}
                        onChange={(e) => updateMetric(globalIdx, { value: e.target.value })}
                        placeholder="0"
                        className={`${inputCls} col-span-6 sm:col-span-3 font-mono`}
                      />
                      <div className="col-span-4 sm:col-span-3">
                        <input
                          list="info-orf-units"
                          value={m.unit}
                          onChange={(e) => updateMetric(globalIdx, { unit: e.target.value })}
                          placeholder="Satuan"
                          className={inputCls}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setMetrics((prev) => prev.filter((_, idx) => idx !== globalIdx))}
                        className="col-span-2 sm:col-span-1 inline-flex justify-center rounded-lg p-2 text-[#C0392B] hover:bg-red-50 transition cursor-pointer"
                        aria-label="Hapus metrik"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Line penyaluran gas */}
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#0077C8]">Line Penyaluran Gas</p>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1 rounded-lg border border-[#DCE5EF] bg-white px-2 py-1 text-[10px] font-bold text-[#0077C8] hover:bg-[#EDF4FB] transition cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Tambah Line
            </button>
          </div>
          <div className="mt-2.5 space-y-2">
            {lines.length === 0 && <p className="text-[11px] text-[#8A9DB4]">Belum ada line penyaluran. Kode/nama wajib diisi; angka boleh dikosongkan.</p>}
            {lines.map((l, i) => (
              <div key={`line-${i}`} className="rounded-lg border border-[#E2E8F0] bg-white p-2.5">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <input value={l.lineCode} onChange={(e) => updateLine(i, { lineCode: e.target.value })} placeholder="Kode (mis. LINE-01)" className={`${inputCls} col-span-4 sm:col-span-2 font-mono`} />
                  <input value={l.lineName} onChange={(e) => updateLine(i, { lineName: e.target.value })} placeholder="Nama line / pelanggan" className={`${inputCls} col-span-7 sm:col-span-9`} />
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                    className="col-span-1 inline-flex justify-center rounded-lg p-2 text-[#C0392B] hover:bg-red-50 transition cursor-pointer"
                    aria-label="Hapus line"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    ['Flow', 'flowRate', 'flowUnit', l.flowRate, l.flowUnit],
                    ['Volume', 'volume', 'volumeUnit', l.volume, l.volumeUnit],
                    ['Energy', 'energy', 'energyUnit', l.energy, l.energyUnit],
                    ['Temperature', 'temperature', 'temperatureUnit', l.temperature, l.temperatureUnit],
                  ] as const).map(([label, valueKey, unitKey, value, unit]) => (
                    <div key={valueKey} className="flex gap-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={value}
                        onChange={(e) => updateLine(i, { [valueKey]: e.target.value })}
                        placeholder={label}
                        aria-label={`${label} ${l.lineName || l.lineCode}`}
                        className={`${inputCls} min-w-0 flex-1 font-mono`}
                      />
                      <input
                        list="info-orf-units"
                        value={unit}
                        onChange={(e) => updateLine(i, { [unitKey]: e.target.value })}
                        aria-label={`Satuan ${label} ${l.lineName || l.lineCode}`}
                        className={`${inputCls} w-24 shrink-0`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Catatan */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-[#5F718A]">Catatan Laporan (opsional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Catatan operasional periode ini…" className={inputCls} />
        </div>

        <datalist id="info-orf-units">
          {INFO_ORF_ALLOWED_UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </div>
    </Modal>
  );
}
