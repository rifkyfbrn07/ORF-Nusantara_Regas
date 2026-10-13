'use client';

import React, { useState } from 'react';
import { InfoOrfDashboardDTO, InfoOrfReportDTO } from '@/lib/infoOrfTypes';
import { getInfoOrfReportsForDateAction } from '@/server/actions/infoOrfActions';
import { MonitoringOrfAnalytics } from './MonitoringOrfAnalytics';
import { MonitoringOrfOverview } from './MonitoringOrfOverview';
import { MonitoringOrfReportForm } from './MonitoringOrfReportForm';
import { NextCargoPanel } from '@/components/infoOrf/NextCargoPanel';
import { NextCargoFormModal } from '@/components/infoOrf/NextCargoFormModal';
import type { NextCargoDTO } from '@/lib/infoOrfTypes';

type Tab = 'overview' | 'input' | 'history';

export function MonitoringOrfClient({
  initialData,
  canEdit,
}: {
  initialData: InfoOrfDashboardDTO;
  canEdit: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [latest, setLatest] = useState<InfoOrfReportDTO | null>(initialData.latest);
  const [nextCargo, setNextCargo] = useState<NextCargoDTO | null>(initialData.nextCargo);
  const [showCargoForm, setShowCargoForm] = useState(false);
  const [formReport, setFormReport] = useState<InfoOrfReportDTO | null>(null);
  const [savedReport, setSavedReport] = useState<InfoOrfReportDTO | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [lookupError, setLookupError] = useState<string | null>(null);

  function openCreate() {
    setFormReport(null);
    setFormKey((key) => key + 1);
    setLookupError(null);
    setActiveTab('input');
  }

  function openEdit(report: InfoOrfReportDTO) {
    setFormReport(report);
    setFormKey((key) => key + 1);
    setLookupError(null);
    setActiveTab('input');
  }

  async function resolveDuplicate(date: string, hour: string) {
    const result = await getInfoOrfReportsForDateAction(date);
    if (!result.success) {
      setLookupError(result.error);
      return;
    }
    const duplicate = result.reports.find((report) => report.reportHour === hour);
    if (duplicate) openEdit(duplicate);
    else setLookupError('Laporan duplikat ditemukan, tetapi belum berhasil dimuat untuk diedit.');
  }

  function handleSaved(report: InfoOrfReportDTO) {
    setLatest((previous) => !previous || previous.id === report.id || report.reportTime > previous.reportTime ? report : previous);
    setSavedReport(report);
    setFormReport(null);
    setActiveTab('overview');
  }

  const tabClass = (tab: Tab) => `rounded-lg px-3.5 py-2 text-xs font-bold transition ${
    activeTab === tab ? 'bg-[#0066B3] text-white' : 'text-[#52677F] hover:bg-[#F0F6FB]'
  }`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 rounded-xl border border-[#DCE5EF] bg-white p-1.5">
        <button type="button" onClick={() => setActiveTab('overview')} className={tabClass('overview')}>Overview</button>
        <button type="button" onClick={() => canEdit ? openCreate() : setActiveTab('input')} className={tabClass('input')}>Input Laporan</button>
        <button type="button" onClick={() => setActiveTab('history')} className={tabClass('history')}>Grafik &amp; Histori</button>
      </div>

      {lookupError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{lookupError}</p>}

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <MonitoringOrfOverview report={latest} canEdit={canEdit} onEdit={openEdit} onCreate={openCreate} />
          <NextCargoPanel cargo={nextCargo} onEdit={canEdit ? () => setShowCargoForm(true) : undefined} />
        </div>
      )}

      {activeTab === 'input' && (
        canEdit ? (
          <div className="space-y-3">
            <div><h2 className="text-base font-black text-[#123D70]">{formReport ? 'Edit Laporan yang Sudah Ada' : 'Buat Laporan Baru'}</h2><p className="mt-1 text-[11px] text-[#718399]">{formReport ? `Mengubah record ${formReport.reportDate} pukul ${formReport.reportHour}:00 WIB.` : 'Nilai dicatat sesuai waktu input (WIB). Nilai awal berasal dari laporan lebih awal dan belum tersimpan sampai Anda menekan Simpan.'}</p></div>
            <MonitoringOrfReportForm
              key={formKey}
              report={formReport}
              defaultDate={initialData.selectedDate}
              onCancel={() => { setFormReport(null); setActiveTab('overview'); }}
              onSaved={handleSaved}
              onDuplicate={resolveDuplicate}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-[#DCE5EF] bg-white p-6 text-center">
            <h2 className="text-sm font-black text-[#123D70]">Input laporan dibatasi</h2>
            <p className="mt-1 text-xs text-[#64758A]">Role Anda hanya memiliki akses baca. Hubungi Manager atau Admin untuk menambahkan atau mengoreksi laporan.</p>
          </div>
        )
      )}

      {activeTab === 'history' && (
        <MonitoringOrfAnalytics
          initialDate={initialData.selectedDate}
          initialReports={initialData.reportsForSelectedDate}
          latestReport={savedReport || latest}
          canEdit={canEdit}
          onEdit={openEdit}
          onCreate={openCreate}
        />
      )}
      {canEdit && showCargoForm && (
        <NextCargoFormModal
          key={nextCargo?.id ?? 'new-cargo'}
          open
          cargo={nextCargo}
          onClose={() => setShowCargoForm(false)}
          onSaved={(saved) => {
            setNextCargo(saved);
            setShowCargoForm(false);
          }}
        />
      )}
    </div>
  );
}
