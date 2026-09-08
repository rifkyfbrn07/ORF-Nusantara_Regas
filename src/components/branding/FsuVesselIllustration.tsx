import React from 'react';

/**
 * FsuVesselIllustration — ilustrasi profesional kapal FSRU
 * (Floating Storage & Regasification Unit) di area laut terminal.
 *
 * Digunakan sebagai visual pendukung branding "Distribusi Gas & ORF":
 * - Login: bagian bawah background (tidak menutupi form).
 * - Dashboard hero: varian kecil via prop `compact`.
 *
 * Murni SVG inline (tanpa dependency), corporate/industrial style.
 */
export function FsuVesselIllustration({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <svg
      viewBox={compact ? '0 0 400 120' : '0 0 1200 220'}
      className={className}
      role="img"
      aria-label="Kapal FSRU di terminal LNG"
      preserveAspectRatio="xMidYMax meet"
    >
      {/* Laut */}
      {!compact && (
        <>
          <rect x="0" y="150" width="1200" height="70" fill="#0E3A5C" opacity="0.55" />
          <rect x="0" y="150" width="1200" height="4" fill="#7FB4D9" opacity="0.35" />
          {/* Gelombang halus */}
          <path d="M0 168 Q60 162 120 168 T240 168 T360 168 T480 168 T600 168 T720 168 T840 168 T960 168 T1080 168 T1200 168" stroke="#9CC7E4" strokeWidth="1.5" fill="none" opacity="0.28" />
          <path d="M0 186 Q60 180 120 186 T240 186 T360 186 T480 186 T600 186 T720 186 T840 186 T960 186 T1080 186 T1200 186" stroke="#9CC7E4" strokeWidth="1.5" fill="none" opacity="0.2" />
          <path d="M0 202 Q80 197 160 202 T320 202 T480 202 T640 202 T800 202 T960 202 T1120 202 T1200 202" stroke="#9CC7E4" strokeWidth="1.5" fill="none" opacity="0.14" />
        </>
      )}

      {/* Dermaga/jetty sederhana (kiri) */}
      {!compact && (
        <g opacity="0.5">
          <rect x="60" y="118" width="150" height="6" fill="#1D4E74" />
          <rect x="70" y="124" width="6" height="42" fill="#1D4E74" />
          <rect x="130" y="124" width="6" height="42" fill="#1D4E74" />
          <rect x="190" y="124" width="6" height="42" fill="#1D4E74" />
          <circle cx="202" cy="112" r="4" fill="#F59E0B" opacity="0.9" />
        </g>
      )}

      {/* ================= FSRU ================= */}
      <g transform={compact ? 'scale(0.42) translate(10,10)' : 'translate(430,0)'}>
        {/* Hull */}
        <path
          d="M20 150 L330 150 L348 132 L348 118 L20 118 Z"
          fill="#12365A"
          stroke="#0B2740"
          strokeWidth="1.5"
        />
        {/* Garis lambung */}
        <rect x="20" y="118" width="328" height="5" fill="#E1251B" opacity="0.85" />
        <rect x="20" y="140" width="328" height="4" fill="#7FB4D9" opacity="0.25" />
        {/* Pallas/window baris di lambung superstructure */}
        <g fill="#BFE0F5" opacity="0.85">
          <rect x="300" y="126" width="7" height="7" rx="1" />
          <rect x="311" y="126" width="7" height="7" rx="1" />
          <rect x="322" y="126" width="7" height="7" rx="1" />
        </g>

        {/* Superstructure (stern, kanan) */}
        <g>
          <rect x="286" y="86" width="54" height="32" rx="2" fill="#E8F1F8" stroke="#9DBBD1" strokeWidth="1" />
          <rect x="294" y="70" width="38" height="16" rx="2" fill="#F4F9FD" stroke="#9DBBD1" strokeWidth="1" />
          <rect x="300" y="58" width="26" height="12" rx="2" fill="#F4F9FD" stroke="#9DBBD1" strokeWidth="1" />
          {/* Window strips */}
          <g fill="#3E6E96" opacity="0.8">
            <rect x="291" y="92" width="44" height="3" />
            <rect x="291" y="99" width="44" height="3" />
            <rect x="298" y="75" width="30" height="3" />
          </g>
          {/* Mast + radar */}
          <rect x="310" y="26" width="3" height="32" fill="#34506B" />
          <path d="M304 32 L319 32" stroke="#34506B" strokeWidth="2" />
          <circle cx="311.5" cy="24" r="3.5" fill="#F59E0B" opacity="0.95" />
          {/* Cerobong */}
          <rect x="326" y="74" width="9" height="14" rx="1.5" fill="#C2410C" opacity="0.9" />
        </g>

        {/* Tangki LNG di dek (2 silinder + 1 membulat) */}
        <g stroke="#8FB6D3" strokeWidth="1">
          <circle cx="90" cy="86" r="32" fill="#DCEBF6" opacity="0.95" />
          <circle cx="170" cy="86" r="32" fill="#D2E5F3" opacity="0.95" />
          <rect x="212" y="62" width="56" height="48" rx="10" fill="#DEEDF8" opacity="0.95" />
        </g>
        {/* Highlight tangki */}
        <g fill="#FFFFFF" opacity="0.55">
          <ellipse cx="80" cy="74" rx="10" ry="6" />
          <ellipse cx="160" cy="74" rx="10" ry="6" />
          <rect x="218" y="68" width="14" height="6" rx="3" />
        </g>
        {/* Pipa dek */}
        <g stroke="#5E82A0" strokeWidth="2.5" opacity="0.8">
          <path d="M90 118 L90 110 M170 118 L170 110 M240 118 L240 110" />
          <path d="M90 110 L240 110" strokeWidth="2" />
        </g>
        {/* Menara regas + flare */}
        <g>
          <rect x="36" y="60" width="5" height="58" fill="#34506B" />
          <path d="M36 60 L52 60" stroke="#34506B" strokeWidth="2" />
          <circle cx="38.5" cy="52" r="4" fill="#F97316" opacity="0.9" />
          <path d="M38.5 44 Q34 38 38.5 32 Q43 38 38.5 44" fill="#F59E0B" opacity="0.75" />
        </g>

        {/* Bayangan laut di bawah lambung */}
        <ellipse cx="184" cy="154" rx="175" ry="7" fill="#061F35" opacity="0.45" />
      </g>
    </svg>
  );
}
