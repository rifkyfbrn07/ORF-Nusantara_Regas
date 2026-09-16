'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Activity, Radio, Gauge, ArrowRight } from 'lucide-react';

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
  return (
    <div className="card-command-center p-5 flex flex-col justify-between h-full min-h-[300px]">
      {/* 1. Header with LIVE Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shrink-0">
            <Activity className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-[#0B3568] dark:text-[#F5FAFF] uppercase tracking-wider leading-tight">
              FACILITY STATUS
            </h3>
            <p className="text-[11px] text-[#64748B] dark:text-[#AFC4D6] font-medium mt-0.5">
              Monitoring fasilitas terminal
            </p>
          </div>
        </div>

        {/* Live Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22A65A]/10 dark:bg-[rgba(105,190,40,0.12)] border border-[#22A65A]/30 dark:border-[rgba(105,190,40,0.25)] text-[#22A65A] dark:text-[#69BE28] text-[10px] font-black uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22A65A] dark:bg-[#69BE28] shadow-[0_0_6px_#69BE28] animate-pulse-subtle" />
          LIVE
        </div>
      </div>

      {/* 2. Middle: Photo Banner of FSRU Vessel + Name + Operational Badge */}
      <div className="my-auto py-2 space-y-2">
        <div className="relative w-full h-24 sm:h-26 rounded-xl overflow-hidden border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.16)] shadow-xs">
          <Image
            src="/images/fsru-jawa-barat.jpg"
            alt={facilityName}
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span className="absolute bottom-1.5 left-2.5 text-[10px] font-mono font-extrabold text-white tracking-wider drop-shadow-md">
            OFFSHORE REGASIFICATION
          </span>
        </div>

        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-black text-[#0B3568] dark:text-[#F5FAFF] tracking-tight">
            {facilityName}
          </h4>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#22A65A]/15 dark:bg-[rgba(105,190,40,0.12)] border border-[#22A65A]/30 dark:border-[rgba(105,190,40,0.25)] text-[#22A65A] dark:text-[#69BE28] text-[10.5px] font-extrabold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22A65A] dark:bg-[#69BE28]" />
            {vesselStatus}
          </span>
        </div>
      </div>

      {/* 3. Bottom Mini Status Badges & Link */}
      <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)]">
        <div className="grid grid-cols-2 gap-2">
          {/* OCC READY */}
          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#F4F9FC] dark:bg-[#081D31] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.12)]">
            <div className="h-7 w-7 rounded-lg bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shrink-0">
              <Radio className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[9px] font-bold text-[#64748B] dark:text-[#CFE0EE] uppercase">
                OCC
              </div>
              <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#22A65A] dark:text-[#69BE28]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22A65A] dark:bg-[#69BE28]" />
                {occStatus}
              </div>
            </div>
          </div>

          {/* ORF ACTIVE */}
          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#F4F9FC] dark:bg-[#081D31] border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.12)]">
            <div className="h-7 w-7 rounded-lg bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shrink-0">
              <Gauge className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[9px] font-bold text-[#64748B] dark:text-[#CFE0EE] uppercase">
                ORF
              </div>
              <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#22A65A] dark:text-[#69BE28]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22A65A] dark:bg-[#69BE28]" />
                {orfStatus}
              </div>
            </div>
          </div>
        </div>

        {/* View Details Link */}
        <div className="flex justify-end pt-1">
          <Link
            href={detailsLink}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#0077C8] dark:text-[#38A9EA] hover:underline"
          >
            Lihat Detail <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
