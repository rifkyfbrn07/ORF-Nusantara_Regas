import React from 'react';
import { Clock3, Pencil, Plus } from 'lucide-react';
import { InfoOrfMetricDTO, InfoOrfReportDTO } from '@/lib/infoOrfTypes';
import { formatIndonesianDate, formatJakartaDate, formatJakartaTime } from '@/lib/time';
import { INFO_ORF_INITIAL_DATA, INFO_ORF_LINE_TEMPLATE } from '@/lib/infoOrfConfig';

function metric(report: InfoOrfReportDTO, key: string): InfoOrfMetricDTO | undefined {
  return report.metrics.find((item) => item.key === key);
}

function formatNumber(value: number | null | undefined): string {
  return value == null ? '—' : value.toLocaleString('id-ID', { maximumFractionDigits: 4 });
}

function MetricTile({ label, value, unit }: { label: string; value: number | undefined; unit: string }) {
  return (
    <div className="rounded-lg border border-[#E5ECF3] bg-[#F8FAFC] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#64758A]">{label}</p>
      <p className="mt-1 text-lg font-black tabular-nums text-[#123D70]">
        {value == null ? '—' : formatNumber(value)}
        {value != null && <span className="ml-1.5 text-[10px] font-bold text-[#0077C8]">{unit}</span>}
      </p>
    </div>
  );
}

export function MonitoringOrfOverview({
  report,
  canEdit,
  onEdit,
  onCreate,
}: {
  report: InfoOrfReportDTO | null;
  canEdit: boolean;
  onEdit: (report: InfoOrfReportDTO) => void;
  onCreate: () => void;
}) {
  if (!report) {
    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <h2 className="text-sm font-black text-amber-900">Data awal Monitoring ORF · {INFO_ORF_INITIAL_DATA.reportHour}:00 WIB</h2>
              <p className="mt-1 text-xs text-amber-800">Nilai awal yang diberikan untuk tanggal {formatIndonesianDate(`${INFO_ORF_INITIAL_DATA.reportDate}T00:00:00+07:00`)}. Data ini belum tersimpan sebagai laporan dan bukan data real-time dari sistem operasional.</p>
              {canEdit && (
                <button onClick={onCreate} type="button" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0066B3] px-4 py-2 text-xs font-bold text-white">
                  <Plus className="h-3.5 w-3.5" /> Simpan Data Awal sebagai Laporan 08:00
                </button>
              )}
            </div>
          </div>
        </section>
        <section className="rounded-xl border border-[#DCE5EF] bg-white p-4">
          <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-[#092B57]">Up Stream</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <MetricTile label="Pressure" value={INFO_ORF_INITIAL_DATA.metrics.PRESSURE} unit="Barg" />
            <MetricTile label="Temperature" value={INFO_ORF_INITIAL_DATA.metrics.TEMPERATURE} unit="Deg F" />
          </div>
        </section>
        <section className="rounded-xl border border-[#DCE5EF] bg-white p-4">
          <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-[#092B57]">Penyaluran Gas per Line</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead><tr className="border-b border-[#E7EDF4] text-[10px] uppercase text-[#64758A]"><th className="py-2 pr-3">Line</th><th className="px-2 py-2 text-right">Flow (MMSCFD)</th><th className="px-2 py-2 text-right">Volume (Mscf/h)</th><th className="px-2 py-2 text-right">Energy (Mmbtu/h)</th><th className="px-2 py-2 text-right">Temperature (Deg F)</th></tr></thead>
              <tbody>{INFO_ORF_INITIAL_DATA.lines.map((line) => (
                <tr key={line.lineCode} className="border-b border-[#F0F3F7] last:border-0">
                  <td className="py-2.5 pr-3 font-semibold text-[#183C63]">{INFO_ORF_LINE_TEMPLATE.find((item) => item.lineCode === line.lineCode)?.lineName}</td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">{formatNumber(line.flowRate)}</td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">{formatNumber(line.volume)}</td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">{formatNumber(line.energy)}</td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">{formatNumber(line.temperature)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[#DCE5EF] bg-white p-4"><h2 className="mb-3 text-xs font-black uppercase tracking-wide text-[#092B57]">Total Penyaluran</h2><MetricTile label="Total MK + TP + MTW" value={INFO_ORF_INITIAL_DATA.metrics.TOTAL_FLOW} unit="MMscfd" /></section>
          <section className="rounded-xl border border-[#DCE5EF] bg-white p-4"><h2 className="mb-3 text-xs font-black uppercase tracking-wide text-[#092B57]">Info FSRU</h2><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><MetricTile label="LNG Flow" value={INFO_ORF_INITIAL_DATA.metrics.LNG_FLOW} unit="M3/H" /><MetricTile label="ROB LNG" value={INFO_ORF_INITIAL_DATA.metrics.ROB_LNG} unit="M3" /></div></section>
        </div>
        <section className="rounded-xl border border-[#DCE5EF] bg-white p-4">
          <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-[#092B57]">Next Cargo · Data Awal</h2>
          <p className="text-sm font-black text-[#123D70]">{INFO_ORF_INITIAL_DATA.nextCargo.cargoCode}</p>
          <p className="text-xs text-[#64758A]">ETA tanggal {formatIndonesianDate(`${INFO_ORF_INITIAL_DATA.nextCargo.etaDate}T00:00:00+07:00`)} (jam tidak diberikan).</p>
        </section>
      </div>
    );
  }

  const pressure = metric(report, 'PRESSURE');
  const upstreamTemperature = metric(report, 'TEMPERATURE');
  const total = metric(report, 'TOTAL_FLOW');
  const lngFlow = metric(report, 'LNG_FLOW');
  const rob = metric(report, 'ROB_LNG');

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCE5EF] bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF4FC] text-[#0077C8]"><Clock3 className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-[#0077C8]">{report.source === 'AUTOMATIC' ? `Laporan Otomatis${report.wasEdited ? ' · Diedit' : ''}` : report.wasEdited ? 'Laporan Diedit' : 'Laporan Terbaru'}</p>
            <p className="text-lg font-black text-[#092B57]">{formatIndonesianDate(report.reportDate)} · {report.reportHour}:00 WIB</p>
            <p className="text-[10px] text-[#64758A]">
              Diperbarui {formatJakartaDate(report.updatedAt)} {formatJakartaTime(report.updatedAt)} WIB
              {report.source === 'AUTOMATIC' ? ' · Dibuat otomatis dari laporan sebelumnya' : report.recordedBy?.name ? ` · ${report.recordedBy.name}` : ''}
            </p>
          </div>
        </div>
        {canEdit && (
          <button type="button" onClick={() => onEdit(report)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9D8E7] px-3 py-2 text-xs font-bold text-[#0066B3] hover:bg-[#F4F9FC]">
            <Pencil className="h-3.5 w-3.5" /> Edit Data
          </button>
        )}
      </section>

      <section className="rounded-xl border border-[#DCE5EF] bg-white p-4">
        <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-[#092B57]">A. Up Stream</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <MetricTile label="Pressure" value={pressure?.value} unit={pressure?.unit || 'Barg'} />
          <MetricTile label="Temperature" value={upstreamTemperature?.value} unit={upstreamTemperature?.unit || 'Deg F'} />
        </div>
      </section>

      <section className="rounded-xl border border-[#DCE5EF] bg-white p-4">
        <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-[#092B57]">B. Penyaluran Gas</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E7EDF4] text-[10px] uppercase text-[#64758A]">
                <th className="py-2 pr-3">Line</th>
                <th className="px-2 py-2 text-right">Flow (MMSCFD)</th>
                <th className="px-2 py-2 text-right">Volume (Mscf/h)</th>
                <th className="px-2 py-2 text-right">Energy (Mmbtu/h)</th>
                <th className="px-2 py-2 text-right">Temperature (Deg F)</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.map((line) => (
                <tr key={line.id} className="border-b border-[#F0F3F7] last:border-0">
                  <td className="py-2.5 pr-3 font-semibold text-[#183C63]">{line.lineName}</td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">{formatNumber(line.flowRate)}</td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">{formatNumber(line.volume)}</td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">{formatNumber(line.energy)}</td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums">{formatNumber(line.temperature)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[#DCE5EF] bg-white p-4">
          <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-[#092B57]">C. Total Penyaluran</h2>
          <MetricTile label="Total MK + TP + MTW" value={total?.value} unit={total?.unit || 'MMscfd'} />
        </section>
        <section className="rounded-xl border border-[#DCE5EF] bg-white p-4">
          <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-[#092B57]">D. Info FSRU</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <MetricTile label="LNG Flow" value={lngFlow?.value} unit={lngFlow?.unit || 'M3/H'} />
            <MetricTile label="ROB LNG" value={rob?.value} unit={rob?.unit || 'M3'} />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-[#DCE5EF] bg-white p-4">
        <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-[#092B57]">E. Next Cargo pada Laporan Ini</h2>
        {report.nextCargo ? (
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <div><p className="text-[10px] uppercase text-[#64758A]">Kode Cargo</p><p className="mt-1 text-sm font-black text-[#123D70]">{report.nextCargo.cargoCode}</p></div>
            <div><p className="text-[10px] uppercase text-[#64758A]">ETA</p><p className="mt-1 text-sm font-black text-[#123D70]">{formatIndonesianDate(report.nextCargo.eta)} · {formatJakartaTime(report.nextCargo.eta)} WIB</p></div>
          </div>
        ) : <p className="text-xs text-[#64758A]">Belum ada informasi Next Cargo pada laporan ini.</p>}
      </section>
      <p className="px-1 text-[10px] text-[#77899D]">Data berdasarkan laporan tersimpan; bukan pembacaan otomatis real-time dari sistem operasional.</p>
    </div>
  );
}
