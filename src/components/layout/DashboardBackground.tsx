'use client';

import React from 'react';

/**
 * DashboardBackground provides the exact atmospheric background, concentric orbital arcs,
 * floating color nodes, and geometric corner pills as seen on the Pertamina Nusantara Regas Login screen.
 */
export function DashboardBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Atmospheric Ambient Glows */}
      <div className="absolute top-0 right-0 w-[60vw] max-w-[800px] h-[600px] bg-radial from-[#0077C8]/8 dark:from-[#0077C8]/16 via-transparent to-transparent blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[50vw] max-w-[700px] h-[500px] bg-radial from-[#22A65A]/6 dark:from-[#22A65A]/10 via-transparent to-transparent blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] bg-radial from-white/60 dark:from-transparent to-transparent blur-2xl" />

      {/* 2. Concentric Orbital Arcs */}
      <svg
        className="absolute -top-40 right-[-12vw] w-[900px] sm:w-[1300px] h-[900px] sm:h-[1300px] opacity-80 dark:opacity-40 animate-orbit-ultra-slow"
        viewBox="0 0 1300 1300"
        fill="none"
      >
        {/* Outer Orbit */}
        <circle cx="650" cy="650" r="580" stroke="#0077C8" strokeOpacity="0.10" strokeWidth="1" strokeDasharray="6 8" />
        {/* Mid Orbit 1 */}
        <circle cx="650" cy="650" r="440" stroke="#0077C8" strokeOpacity="0.12" strokeWidth="1.2" />
        {/* Mid Orbit 2 */}
        <circle cx="650" cy="650" r="310" stroke="#22A65A" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="4 6" />
        {/* Inner Core Orbit */}
        <circle cx="650" cy="650" r="180" stroke="#EF3340" strokeOpacity="0.10" strokeWidth="1" />

        {/* Orbit Colored Nodes (Blue, Green, Red) */}
        <circle cx="340" cy="220" r="5.5" fill="#EF3340" />
        <circle cx="1030" cy="280" r="6" fill="#0077C8" />
        <circle cx="1190" cy="650" r="5" fill="#22A65A" />
      </svg>

      {/* 3. Secondary Bottom-Left Orbit */}
      <svg
        className="absolute -bottom-48 left-[-10vw] w-[700px] h-[700px] opacity-60 dark:opacity-30"
        viewBox="0 0 700 700"
        fill="none"
      >
        <circle cx="350" cy="350" r="300" stroke="#0077C8" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="5 7" />
        <circle cx="350" cy="350" r="200" stroke="#22A65A" strokeOpacity="0.09" strokeWidth="1" />
        <circle cx="550" cy="350" r="4" fill="#0077C8" />
      </svg>
    </div>
  );
}
