'use client';

import React from 'react';
import Image from 'next/image';
import { Ship, Network, Building2, Radio } from 'lucide-react';

interface HeroCommandCenterProps {
  userName: string;
  facilityName?: string;
  facilityStatus?: string;
  lastSync?: string;
}

function getDynamicGreeting(): string {
  const now = new Date();
  const hour = Number(
    now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false })
  );
  if (hour >= 4 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function getFormattedSyncTime(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateStr} · ${timeStr} WIB`;
}

export function HeroCommandCenter({
  userName,
  facilityName = 'ORF Muara Karang',
  facilityStatus = 'OCC READY',
  lastSync,
}: HeroCommandCenterProps) {
  const greeting = getDynamicGreeting();
  const syncTimestamp = lastSync || getFormattedSyncTime();

  return (
    <div className="command-center-hero relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#E2E8F0] dark:border-[rgba(120,190,235,0.14)] bg-gradient-to-r from-white via-[#F8FBFD] to-[#EAF3FA] dark:from-[#0B2034] dark:via-[#0D263E] dark:to-[#081C2D] shadow-[0_4px_24px_rgba(11,53,104,0.06)] dark:shadow-[0_6px_32px_rgba(0,0,0,0.5)] min-h-[240px] sm:min-h-[260px] p-6 sm:p-7 flex flex-col justify-between select-none">
      {/* Background Vessel Image with Seamless Atmospheric Blend (Right side) */}
      <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[60%] lg:w-[52%] pointer-events-none overflow-hidden z-0">
        <div className="relative w-full h-full">
          <Image
            src="/images/fsru-jawa-barat.jpg"
            alt="FSRU Jawa Barat Marine Terminal"
            fill
            className="object-cover object-right opacity-85 dark:opacity-40 transition-opacity duration-300"
            priority
          />
          {/* Atmospheric Left & Bottom Gradients to blend seamless with dark navy */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent dark:from-[#0B2034] dark:via-[#0D263E]/90 dark:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent dark:from-[#081C2D]/95 dark:via-transparent to-transparent" />
        </div>
      </div>

      {/* Decorative Subtle Orbital Background Waves */}
      <div className="absolute -top-24 -left-12 w-96 h-96 rounded-full border border-[#0077C8]/10 dark:border-[#0088D8]/10 pointer-events-none" />
      <div className="absolute -bottom-24 -left-8 w-72 h-72 rounded-full border border-[#22A65A]/10 dark:border-[#69BE28]/10 pointer-events-none" />

      {/* Top Section: Branding & Greeting (Left) + Operation Flow Diagram (Right) */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        {/* Left: Branding & Greeting Hierarchy */}
        <div className="max-w-xl">
          {/* Small Eyebrow Label */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10.5px] font-black tracking-widest uppercase text-[#0077C8] dark:text-[#4DB8F5]">
              SISTEM OPERASIONAL
            </span>
          </div>

          {/* Large Title: Most prominent */}
          <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-black text-[#0B3568] dark:text-[#F7FBFF] tracking-tight leading-tight">
            Distribusi Gas &amp; ORF
          </h1>

          {/* Dynamic Greeting */}
          <p className="text-base sm:text-lg font-bold text-[#123D70] dark:text-[#E6F1FA] mt-1">
            {greeting}, {userName}!
          </p>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#AFC4D6] font-medium mt-0.5 max-w-md">
            Semoga hari ini berjalan lancar dan operasional tetap aman.
          </p>
        </div>

        {/* Right: Floating Operation Flow Diagram Card */}
        <div className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/85 dark:bg-[#0A2237]/85 backdrop-blur-md border border-[#E2E8F0]/90 dark:border-[rgba(100,180,230,0.15)] shadow-sm">
          {/* Step 1: SOURCE */}
          <div className="flex flex-col items-center text-center">
            <div className="h-8 w-8 rounded-full bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shadow-xs border border-[#0077C8]/25 dark:border-[#0088D8]/30">
              <Ship className="h-4 w-4" />
            </div>
            <span className="text-[9px] font-black uppercase text-[#0B3568] dark:text-[#D8E8F5] mt-1 tracking-wider">
              SOURCE
            </span>
          </div>

          {/* Connection Line 1 */}
          <div className="w-8 sm:w-12 h-0.5 bg-gradient-to-r from-[#0077C8] to-[#22A65A] dark:from-[#0088D8] dark:to-[#69BE28] rounded-full relative">
            <span className="absolute left-1/2 -top-1 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-[#22A65A]/20 dark:bg-[#69BE28]/20 flex items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22A65A] dark:bg-[#69BE28]" />
            </span>
          </div>

          {/* Step 2: Terminal */}
          <div className="flex flex-col items-center text-center">
            <div className="h-8 w-8 rounded-full bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shadow-xs border border-[#0077C8]/25 dark:border-[#0088D8]/30">
              <Radio className="h-4 w-4" />
            </div>
            <span className="text-[9px] font-bold text-[#64748B] dark:text-[#7F9AB0] mt-1">
              Terminal
            </span>
          </div>

          {/* Connection Line 2 */}
          <div className="w-8 sm:w-12 h-0.5 bg-gradient-to-r from-[#22A65A] to-[#0077C8] dark:from-[#69BE28] dark:to-[#0088D8] rounded-full relative">
            <span className="absolute left-1/2 -top-1 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-[#0077C8]/20 dark:bg-[#0088D8]/20 flex items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0077C8] dark:bg-[#0088D8]" />
            </span>
          </div>

          {/* Step 3: Distribution */}
          <div className="flex flex-col items-center text-center">
            <div className="h-8 w-8 rounded-full bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shadow-xs border border-[#0077C8]/25 dark:border-[#0088D8]/30">
              <Network className="h-4 w-4" />
            </div>
            <span className="text-[9px] font-bold text-[#64748B] dark:text-[#7F9AB0] mt-1">
              Distribution
            </span>
          </div>

          {/* Connection Line 3 */}
          <div className="w-8 sm:w-12 h-0.5 bg-gradient-to-r from-[#0077C8] to-[#22A65A] dark:from-[#0088D8] dark:to-[#69BE28] rounded-full relative">
            <span className="absolute left-1/2 -top-1 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-[#22A65A]/20 dark:bg-[#69BE28]/20 flex items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22A65A] dark:bg-[#69BE28]" />
            </span>
          </div>

          {/* Step 4: Customer */}
          <div className="flex flex-col items-center text-center">
            <div className="h-8 w-8 rounded-full bg-[#0077C8]/10 dark:bg-[#0088D8]/20 text-[#0077C8] dark:text-[#45B5F4] flex items-center justify-center shadow-xs border border-[#0077C8]/25 dark:border-[#0088D8]/30">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-[9px] font-bold text-[#64748B] dark:text-[#7F9AB0] mt-1">
              Customer
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Floating Status Pill (Left-aligned) */}
      <div className="relative z-10 mt-6 sm:mt-8">
        <div className="inline-flex flex-wrap items-center gap-3 sm:gap-4 px-4 py-2 rounded-2xl bg-white/90 dark:bg-[#09263E] backdrop-blur-md border border-[#E2E8F0] dark:border-[rgba(50,160,220,0.20)] shadow-xs">
          {/* Facility Status */}
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#69BE28] shadow-[0_0_8px_#69BE28] animate-pulse-subtle" />
            <div>
              <div className="text-xs font-black text-[#0B3568] dark:text-[#F3F8FC] leading-tight">
                {facilityName}
              </div>
              <div className="text-[9.5px] font-extrabold text-[#22A65A] dark:text-[#69BE28] tracking-wider uppercase">
                {facilityStatus}
              </div>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="hidden sm:block w-px h-6 bg-[#E2E8F0] dark:bg-[rgba(120,190,235,0.2)]" />

          {/* Synchronization Info */}
          <div>
            <div className="text-[9px] font-bold text-[#64748B] dark:text-[#B7CBDD] uppercase tracking-wider">
              Last synchronization
            </div>
            <div className="text-[11px] font-bold text-[#123D70] dark:text-[#F0F7FC] font-mono">
              {syncTimestamp}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Bottom-Right Ribbon Accent */}
      <div className="corner-ribbon-br" />
    </div>
  );
}
