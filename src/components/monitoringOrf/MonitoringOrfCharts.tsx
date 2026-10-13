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
import { INFO_ORF_LINE_TEMPLATE } from '@/lib/infoOrfConfig';

const COLORS = ['#0077C8', '#E47724', '#4D8C57', '#7B61A8', '#D14D72', '#278A8C'];
const PARAMETERS = [
  { key: 'FLOW', label: 'Flow', unit: 'MMSCFD', lineField: 'flowRate' },
  { key: 'VOLUME', label: 'Volume', unit: 'Mscf/h', lineField: 'volume' },
  { key: 'ENERGY', label: 'Energy', unit: 'Mmbtu/h', lineField: 'energy' },
  { key: 'LINE_TEMPERATURE', label: 'Temperature per line', unit: 'Deg F', lineField: 'temperature' },
  { key: 'PRESSURE', label: 'Pressure Up Stream', unit: 'Barg', metricKey: 'PRESSURE' },
  { key: 'UPSTREAM_TEMPERATURE', label: 'Temperature Up Stream', unit: 'Deg F', metricKey: 'TEMPERATURE' },
  { key: 'LNG_FLOW', label: 'LNG Flow', unit: 'M3/H', metricKey: 'LNG_FLOW' },
  { key: 'ROB_LNG', label: 'ROB LNG', unit: 'M3', metricKey: 'ROB_LNG' },
] as const;

type ParameterKey = (typeof PARAMETERS)[number]['key'];
type ChartPoint = Record<string, string | number | null>;
type ChartSeries = { key: string; label: string; color: string };

function Plot({
  title,
  unit,
  data,
  series,
}: {
  title: string;
  unit: string;
  data: ChartPoint[];
  series: ChartSeries[];
}) {
  const hasValues = data.some((point) => series.some((item) => typeof point[item.key] === 'number'));

  return (
    <section className="rounded-xl border border-[#DCE5EF] bg-white p-3 sm:p-4">
      <h3 className="mb-3 text-xs font-black text-[#123D70]">{title} <span className="font-semibold text-[#6B7D91]">({unit})</span></h3>
      {!hasValues ? (
        <div className="rounded-lg border border-dashed border-[#BDCDDE] px-4 py-8 text-center text-xs font-semibold text-[#64758A]">
          Tidak ada nilai {title.toLowerCase()} pada laporan yang sesuai dengan filter ini.
        </div>
      ) : (
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
      )}
    </section>
  );
}

export function MonitoringOrfCharts({ reports }: { reports: InfoOrfReportDTO[] }) {
  const [parameter, setParameter] = useState<ParameterKey>('FLOW');
  const [lineCode, setLineCode] = useState('ALL');
  const selectedParameter = PARAMETERS.find((item) => item.key === parameter) ?? PARAMETERS[0];
  const lineField = 'lineField' in selectedParameter ? selectedParameter.lineField : null;
  const metricKey = 'metricKey' in selectedParameter ? selectedParameter.metricKey : null;
  const isLineParameter = lineField !== null;
  const selectedLines = useMemo(
    () => lineCode === 'ALL'
      ? INFO_ORF_LINE_TEMPLATE
      : INFO_ORF_LINE_TEMPLATE.filter((line) => line.lineCode === lineCode),
    [lineCode]
  );

  const series: ChartSeries[] = isLineParameter
    ? selectedLines.map((line) => ({
        key: line.lineCode,
        label: line.lineName,
        color: COLORS[INFO_ORF_LINE_TEMPLATE.findIndex((template) => template.lineCode === line.lineCode) % COLORS.length],
      }))
    : [{ key: 'value', label: selectedParameter.label, color: COLORS[0] }];

  const data: ChartPoint[] = reports.map((report) => {
    const point: ChartPoint = { time: `${report.reportHour}:00` };
    if (lineField) {
      for (const line of report.lines) {
        if (selectedLines.some((selected) => selected.lineCode === line.lineCode)) {
          point[line.lineCode] = line[lineField] ?? null;
        }
      }
    } else {
      point.value = metricKey ? report.metrics.find((metric) => metric.key === metricKey)?.value ?? null : null;
    }
    return point;
  });

  const fieldClass = 'w-full rounded-lg border border-[#DCE5EF] bg-white px-2.5 py-2 text-xs focus:outline-none focus:border-[#0077C8]';

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 rounded-xl border border-[#DCE5EF] bg-white p-4 sm:grid-cols-2">
        <label className="text-[10px] font-bold uppercase tracking-wide text-[#5F718A]">
          Parameter Grafik
          <select value={parameter} onChange={(event) => setParameter(event.target.value as ParameterKey)} className={`${fieldClass} mt-1`}>
            {PARAMETERS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wide text-[#5F718A]">
          Line penyaluran
          <select value={lineCode} onChange={(event) => setLineCode(event.target.value)} className={`${fieldClass} mt-1`}>
            <option value="ALL">Semua Line</option>
            {INFO_ORF_LINE_TEMPLATE.map((line) => <option key={line.lineCode} value={line.lineCode}>{line.lineName}</option>)}
          </select>
        </label>
        {!isLineParameter && <p className="text-[10px] text-[#73869A] sm:col-span-2">Parameter ini tidak terkait line penyaluran; pilihan line hanya digunakan untuk Flow, Volume, Energy, dan Temperature per line.</p>}
      </section>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#BDCDDE] bg-white px-5 py-10 text-center text-xs font-semibold text-[#64758A]">
          Tidak ada laporan tersimpan yang sesuai dengan tanggal dan rentang jam grafik.
        </div>
      ) : (
        <Plot title={selectedParameter.label} unit={selectedParameter.unit} data={data} series={series} />
      )}
    </div>
  );
}
