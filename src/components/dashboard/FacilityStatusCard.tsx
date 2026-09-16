'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Activity, Radio, Gauge, ArrowRight, Ship, Factory, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { Modal } from '@/components/ui/Modal';

interface FacilityStatusCardProps {
  facilityName?: string;
  vesselStatus?: string;
  occStatus?: string;
  orfStatus?: string;
  detailsLink?: string;
}

export function FacilityStatusCard({
  facilityName = 'FSRU JAWA BARAT',
  vesselStatus = 'Operational',
  occStatus = 'READY',
  orfStatus = 'ACTIVE',
  detailsLink = '/manager/workforce',
}: FacilityStatusCardProps) {
  const [activeTab, setActiveTab] = useState<'FSRU' | 'ORF'>('FSRU');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const facilities = {
    FSRU: {
      name: 'FSRU JAWA BARAT',
      tagline: 'OFFSHORE REGASIFICATION TERMINAL',
      telemetryId: 'TEL::NR-FSRU-01',
      coordinates: '5° 52′ S, 106° 50′ E · Teluk Jakarta',
      status: vesselStatus,
      statusClass: 'bg-[#22A65A]/15 dark:bg-[rgba(105,190,40,0.12)] border-[#22A65A]/30 dark:border-[rgba(105,190,40,0.25)] text-[#22A65A] dark:text-[#69BE28]',
      image: '/images/fsru-jawa-barat.jpg',
      icon: Ship,
      capacity: '500 MMSCFD',
      storage: '170,000 m³ LNG',
      metricLabel: 'REGAS CAPACITY',
      metricVal: '500 MMSCFD',
      primaryStat: { label: 'OCC LINK', val: occStatus, icon: Radio },
      secondaryStat: { label: 'PRESSURE', val: '58.4 BAR', icon: Gauge },
      description: 'Kapal Floating Storage and Regasification Unit pertama di Indonesia untuk pasokan gas pembangkit listrik.',
    },
    ORF: {
      name: 'ORF MUARA KARANG',
      tagline: 'ONSHORE RECEIVING FACILITY',
      telemetryId: 'TEL::NR-ORF-01',
      coordinates: '6° 6′ S, 106° 47′ E · Muara Karang',
      status: orfStatus,
      statusClass: 'bg-[#22A65A]/15 dark:bg-[rgba(105,190,40,0.12)] border-[#22A65A]/30 dark:border-[rgba(105,190,40,0.25)] text-[#22A65A] dark:text-[#69BE28]',
      image: '/images/orf-muara-karang.jpg',
      icon: Factory,
      capacity: 'Dual Stream Active',
      storage: '21 km Subsea Pipeline',
      metricLabel: 'FLOW RATE',
      metricVal: '100% NOMINAL',
      primaryStat: { label: 'STREAM A/B', val: 'ACTIVE', icon: Gauge },
      secondaryStat: { label: 'GRID FEED', val: 'PLN & PGN', icon: Radio },
      description: 'Fasilitas penerimaan gas darat yang mendistribusikan gas regasifikasi ke PLTGU Muara Karang dan PGN.',
    },
  };

  const current = facilities[activeTab];

  return (
    <>
      <div className="card-command-center p-5 flex flex-col justify-between h-full min-h-[310px] select-none relative overflow-hidden group">
        {/* Subtle Preloader-style orbital decorative ring in background */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full border border-[#0077C8]/10 dark:border-[#0088D8]/10 pointer-events-none" />

        {/* 1. Header with Preloader-style dual toggle & LIVE badge */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shrink-0 shadow-2xs">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-[#0B3568] dark:text-[#F5FAFF] uppercase tracking-wider leading-tight">
                  FACILITY STATUS
                </h3>
                <p className="text-[10px] text-[#64748B] dark:text-[#AFC4D6] font-medium">
                  Monitoring fasilitas terminal &amp; ORF
                </p>
              </div>
            </div>

            {/* Live Beacon */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#22A65A]/10 dark:bg-[rgba(105,190,40,0.12)] border border-[#22A65A]/30 dark:border-[rgba(105,190,40,0.25)] text-[#22A65A] dark:text-[#69BE28] text-[9.5px] font-black tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22A65A] dark:bg-[#69BE28] shadow-[0_0_6px_#69BE28] animate-pulse-subtle" />
              LIVE
            </div>
          </div>

          {/* Interactive Preloader-Inspired Facility Switcher (FSRU / ORF) */}
          <div className="mt-3 flex items-center p-1 rounded-xl bg-[#F4F9FC] dark:bg-[#081D31] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('FSRU')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10.5px] font-black transition-all cursor-pointer',
                activeTab === 'FSRU'
                  ? 'bg-[#0077C8] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-[#8EA7BD] hover:text-[#0B3568] dark:hover:text-[#F5FAFF]'
              )}
            >
              <Ship className="h-3.5 w-3.5" />
              FSRU Jawa Barat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ORF')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10.5px] font-black transition-all cursor-pointer',
                activeTab === 'ORF'
                  ? 'bg-[#0077C8] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-[#8EA7BD] hover:text-[#0B3568] dark:hover:text-[#F5FAFF]'
              )}
            >
              <Factory className="h-3.5 w-3.5" />
              ORF Muara Karang
            </button>
          </div>
        </div>

        {/* 2. Middle: Authentic Photo Banner with Telemetry Badges */}
        <div
          onClick={() => setIsDetailModalOpen(true)}
          className="my-2.5 space-y-2 cursor-pointer group/card"
          title="Klik untuk melihat telemetri lengkap"
        >
          <div className="relative w-full h-28 sm:h-30 rounded-xl overflow-hidden border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.16)] shadow-xs transition-transform duration-200 group-hover/card:scale-[1.01]">
            <Image
              src={current.image}
              alt={current.name}
              fill
              className="object-cover object-center transition-all duration-300 group-hover/card:scale-104"
              priority
            />
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

            {/* Top Telemetry ID Pill */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/20 text-[9px] font-mono font-black text-[#69BE28]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#69BE28] animate-pulse-subtle" />
              {current.telemetryId}
            </div>

            {/* Bottom Facility Name & Tagline */}
            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between">
              <div>
                <span className="text-[9px] font-mono font-extrabold text-slate-300 tracking-wider block">
                  {current.tagline}
                </span>
                <span className="text-xs font-black text-white drop-shadow-md flex items-center gap-1">
                  {current.name}
                </span>
              </div>
              <span className="text-[9.5px] font-mono font-bold text-[#38BDF8] bg-black/50 backdrop-blur-xs px-1.5 py-0.5 rounded">
                {current.metricVal}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-[#64748B] dark:text-[#8EA7BD] truncate">
              {current.coordinates}
            </span>
            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-extrabold shrink-0', current.statusClass)}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {current.status}
            </span>
          </div>
        </div>

        {/* 3. Bottom Mini Status Badges & Link */}
        <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)]">
          <div className="grid grid-cols-2 gap-2">
            {/* Primary Telemetry Stat */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-[#F4F9FC] dark:bg-[#081D31] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.12)]">
              <div className="h-7 w-7 rounded-lg bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shrink-0">
                <current.primaryStat.icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[8.5px] font-bold text-[#64748B] dark:text-[#CFE0EE] uppercase truncate">
                  {current.primaryStat.label}
                </div>
                <div className="flex items-center gap-1 text-[10.5px] font-extrabold text-[#22A65A] dark:text-[#69BE28] truncate">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22A65A] dark:bg-[#69BE28]" />
                  {current.primaryStat.val}
                </div>
              </div>
            </div>

            {/* Secondary Telemetry Stat */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-[#F4F9FC] dark:bg-[#081D31] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.12)]">
              <div className="h-7 w-7 rounded-lg bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shrink-0">
                <current.secondaryStat.icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[8.5px] font-bold text-[#64748B] dark:text-[#CFE0EE] uppercase truncate">
                  {current.secondaryStat.label}
                </div>
                <div className="flex items-center gap-1 text-[10.5px] font-extrabold text-[#0B3568] dark:text-[#F5FAFF] truncate">
                  {current.secondaryStat.val}
                </div>
              </div>
            </div>
          </div>

          {/* View Details Link / Modal trigger */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <span className="h-1 w-2.5 rounded-full bg-[#0077C8]" />
              <span className="h-1 w-2.5 rounded-full bg-[#22A65A]" />
              <span className="h-1 w-2.5 rounded-full bg-[#EF3340]" />
            </div>
            <button
              type="button"
              onClick={() => setIsDetailModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-black text-[#0077C8] dark:text-[#38A9EA] hover:underline cursor-pointer"
            >
              Inspeksi Fasilitas <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Preloader-Themed Full Telemetry Modal */}
      <Modal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Telemetri Fasilitas Operasional"
        eyebrow="Pertamina Nusantara Regas // Command Center"
        size="lg"
      >
        <div className="space-y-5">
          {/* Header Description */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-[#0077C8]/10 via-[#22A65A]/10 to-transparent border border-[#0077C8]/20 dark:border-[#0088D8]/30">
            <div>
              <h4 className="text-xs sm:text-sm font-black text-[#0B3568] dark:text-[#F5FAFF]">
                Infrastruktur Distribusi Gas &amp; ORF
              </h4>
              <p className="text-[11px] text-[#64748B] dark:text-[#AFC4D6] mt-0.5">
                Rantai pasok LNG Floating Terminal Jawa Barat menuju Onshore Receiving Facility Muara Karang.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#22A65A] dark:text-[#69BE28] bg-white/80 dark:bg-[#081D31] px-2.5 py-1 rounded-full border border-[#22A65A]/30">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22A65A] dark:bg-[#69BE28] animate-pulse-subtle" />
              ALL SYSTEMS ONLINE
            </div>
          </div>

          {/* Grid 2 Facilities: FSRU + ORF */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: FSRU JAWA BARAT */}
            <div className="p-4 rounded-2xl bg-[#F4F9FC] dark:bg-[#081D31] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.16)] space-y-3">
              <div className="relative w-full h-36 rounded-xl overflow-hidden shadow-xs border border-white/20">
                <Image
                  src="/images/fsru-jawa-barat.jpg"
                  alt="FSRU Jawa Barat"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[#38BDF8] text-[9.5px] font-mono font-black">
                  OFFSHORE NODE
                </span>
                <span className="absolute bottom-2 left-2.5 text-xs font-black text-white">
                  FSRU JAWA BARAT
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#AFC4D6] leading-relaxed">
                {facilities.FSRU.description}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                <div className="p-2 rounded-lg bg-white dark:bg-[#0D263E] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.12)]">
                  <span className="text-[9px] text-[#64748B] dark:text-[#8EA7BD] block">Kapasitas Regas</span>
                  <strong className="text-[#0B3568] dark:text-[#F5FAFF]">500 MMSCFD</strong>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#0D263E] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.12)]">
                  <span className="text-[9px] text-[#64748B] dark:text-[#8EA7BD] block">Kapasitas Storage</span>
                  <strong className="text-[#0B3568] dark:text-[#F5FAFF]">170,000 m³ LNG</strong>
                </div>
              </div>
            </div>

            {/* Card 2: ORF MUARA KARANG */}
            <div className="p-4 rounded-2xl bg-[#F4F9FC] dark:bg-[#081D31] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.16)] space-y-3">
              <div className="relative w-full h-36 rounded-xl overflow-hidden shadow-xs border border-white/20">
                <Image
                  src="/images/orf-muara-karang.jpg"
                  alt="ORF Muara Karang"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[#F59E0B] text-[9.5px] font-mono font-black">
                  ONSHORE NODE
                </span>
                <span className="absolute bottom-2 left-2.5 text-xs font-black text-white">
                  ORF MUARA KARANG
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#AFC4D6] leading-relaxed">
                {facilities.ORF.description}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                <div className="p-2 rounded-lg bg-white dark:bg-[#0D263E] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.12)]">
                  <span className="text-[9px] text-[#64748B] dark:text-[#8EA7BD] block">Subsea Pipeline</span>
                  <strong className="text-[#0B3568] dark:text-[#F5FAFF]">21 km Offshore</strong>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#0D263E] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.12)]">
                  <span className="text-[9px] text-[#64748B] dark:text-[#8EA7BD] block">Metering Stream</span>
                  <strong className="text-[#22A65A] dark:text-[#69BE28]">Dual Active Stream</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Preloader Signature Footer Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] text-[10.5px] text-[#64748B] dark:text-[#8EA7BD]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#22A65A] dark:text-[#69BE28]" />
              <span>Reliable • Safe • Sustainable</span>
            </div>
            <span className="font-mono text-[9.5px]">PERTAMINA NUSANTARA REGAS</span>
          </div>
        </div>
      </Modal>
    </>
  );
}

