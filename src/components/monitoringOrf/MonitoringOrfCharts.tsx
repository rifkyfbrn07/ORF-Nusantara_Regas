'use client';

import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { InfoOrfReportDTO } from '@/lib/infoOrfTypes';

const COLORS = ['#0077C8', '#E47724', '#4D8C57', '#7B61A8', '#D14D72', '#278A8C'];
const PARAMETERS = [
  { key: 'FLOW', label: 'Flow per line' },
  { key: 'PRESSURE', label: 'Pressure Up Stream' },
  { key: 'UPSTREAM_TEMPERATURE', label: 'Temperature Up Stream' },
  { key: 'VOLUME', label: 'Volume per line' },
  { key: 'ENERGY', label: 'Energy per line' },
  { key: 'LINE_TEMPERATURE', label: 'Temperature per line' },
  { key: 'LNG_FLOW', label: 'LNG Flow' },
  { key: 'ROB_LNG', label: 'ROB LNG' },
] as const;

function timeLabel(report: InfoOrfReportDTO) {
  const dateLabel = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit' }).format(new Date(report.reportTime));
  return `${dateLabel} ${report.reportHour}:00`;
}

function buildData(reports: InfoOrfReportDTO[], field: 'flowRate' | 'volume' | 'energy' | 'temperature', lineCodes: string[]) {
  return reports.map((report) => {
    const point: Record<string, string | number | null> = { time: timeLabel(report) };
    for (const line of report.lines) {
      if (lineCodes.includes(line.lineCode)) point[line.lineCode] = line[field];
    }
    return point;
  });
}

function Plot({
  title,
  unit,
  data,
  series,
}: {
  title: string;
  unit: string;
  data: Record<string, string | number | null>[];
  series: { key: string; label: string; color: string }[];
}) {
  if (data.length === 0) return null;
  return (
    <section className="rounded-xl border border-[#DCE5EF] bg-white p-3 sm:p-4">
      <h3 className="mb-3 text-xs font-black text-[#123D70]">{title} <span className="font-semibold text-[#6B7D91]">({unit})</span></h3>
      <div className="h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#E8EEF4" strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={20} />
            <YAxis tick={{ fontSize: 10 }} width={58} />
            <Tooltip />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
            {series.map((line) => (
              <Line key={line.key} type="monotone" dataKey={line.key} name={line.label} stroke={line.color} dot={{ r: 2 }} connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function MonitoringOrfCharts({ reports }: { reports: InfoOrfReportDTO[] }) {
  const [parameters, setParameters] = useState<string[]>(PARAMETERS.map((item) => item.key));
  const [lineCodes, setLineCodes] = useState<string[] | null>(null);
  const allLines = useMemo(() => {
    const map = new Map<string, string>();
    for (const report of reports) for (const line of report.lines) map.set(line.lineCode, line.lineName);
    return [...map.entries()];
  }, [reports]);

  const linesToShow = lineCodes ?? allLines.map(([code]) => code);
  const lineSeries = () => allLines
    .filter(([code]) => linesToShow.includes(code))
    .map(([key, label], index) => ({ key, label, color: COLORS[index % COLORS.length] }));

  const metricData = (key: string) => reports.map((report) => ({
    time: timeLabel(report),
    value: report.metrics.find((metric) => metric.key === key)?.value ?? null,
  }));

  function toggle(list: string[], setter: (value: string[]) => void, key: string) {
    setter(list.includes(key) ? list.filter((value) => value !== key) : [...list, key]);
  }

  if (reports.length === 0) {
    return <div className="rounded-xl border border-dashed border-[#BDCDDE] bg-white px-5 py-10 text-center text-xs font-semibold text-[#64758A]">Belum ada data tersimpan untuk rentang waktu ini. Grafik akan muncul setelah laporan dibuat.</div>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#DCE5EF] bg-white p-4">
        <h3 className="text-xs font-black uppercase tracking-wide text-[#123D70]">Parameter Grafik</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {PARAMETERS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#435B74]">
              <input type="checkbox" checked={parameters.includes(key)} onChange={() => toggle(parameters, setParameters, key)} />
              {label}
            </label>
          ))}
        </div>
        {parameters.some((key) => ['FLOW', 'VOLUME', 'ENERGY', 'LINE_TEMPERATURE'].includes(key)) && (
          <div className="mt-3 border-t border-[#EDF2F7] pt-3">
            <p className="mb-2 text-[10px] font-bold uppercase text-[#64758A]">Line yang ditampilkan</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {allLines.map(([code, name]) => (
                <label key={code} className="flex items-center gap-1.5 text-[11px] text-[#435B74]">
                  <input
                    type="checkbox"
                    checked={lineCodes === null || lineCodes.includes(code)}
                    onChange={() => setLineCodes((current) => {
                      const selected = current ?? allLines.map(([lineCode]) => lineCode);
                      return selected.includes(code)
                        ? selected.filter((lineCode) => lineCode !== code)
                        : [...selected, code];
                    })}
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>
        )}
        {lineCodes?.length === 0 && (
          <p className="mt-2 text-[10px] text-amber-700">Pilih setidaknya satu line untuk menampilkan grafik parameter per line.</p>
        )}
      </section>

      {linesToShow.length > 0 && parameters.includes('FLOW') && <Plot title="Flow per Line" unit="MMSCFD" data={buildData(reports, 'flowRate', linesToShow)} series={lineSeries()} />}
      {parameters.includes('PRESSURE') && <Plot title="Pressure Up Stream" unit="Barg" data={metricData('PRESSURE')} series={[{ key: 'value', label: 'Pressure', color: COLORS[0] }]} />}
      {parameters.includes('UPSTREAM_TEMPERATURE') && <Plot title="Temperature Up Stream" unit="Deg F" data={metricData('TEMPERATURE')} series={[{ key: 'value', label: 'Temperature', color: COLORS[1] }]} />}
      {linesToShow.length > 0 && parameters.includes('VOLUME') && <Plot title="Volume per Line" unit="Mscf/h" data={buildData(reports, 'volume', linesToShow)} series={lineSeries()} />}
      {linesToShow.length > 0 && parameters.includes('ENERGY') && <Plot title="Energy per Line" unit="Mmbtu/h" data={buildData(reports, 'energy', linesToShow)} series={lineSeries()} />}
      {linesToShow.length > 0 && parameters.includes('LINE_TEMPERATURE') && <Plot title="Temperature per Line" unit="Deg F" data={buildData(reports, 'temperature', linesToShow)} series={lineSeries()} />}
      {parameters.includes('LNG_FLOW') && <Plot title="LNG Flow" unit="M3/H" data={metricData('LNG_FLOW')} series={[{ key: 'value', label: 'LNG Flow', color: COLORS[2] }]} />}
      {parameters.includes('ROB_LNG') && <Plot title="ROB LNG" unit="M3" data={metricData('ROB_LNG')} series={[{ key: 'value', label: 'ROB LNG', color: COLORS[3] }]} />}
    </div>
  );
}
