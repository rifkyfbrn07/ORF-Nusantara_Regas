'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const STEPS = [['Menghubungkan', 'Database'], ['Sinkronisasi', 'Data'], ['Preparing', 'Dashboard'], ['Sistem Siap', '']] as const;

/** Root application preloader. Its staged progress represents initial client boot. */
export function Preloader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (reduced) {
      timers.push(setTimeout(() => setProgress(100), 0), setTimeout(() => setFading(true), 300), setTimeout(() => setVisible(false), 800));
    } else {
      timers.push(setTimeout(() => setProgress(28), 220), setTimeout(() => setProgress(68), 620), setTimeout(() => setProgress(100), 1120), setTimeout(() => setFading(true), 1500), setTimeout(() => setVisible(false), 1900));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!visible) return null;
  const activeStep = progress < 35 ? 0 : progress < 100 ? 2 : 3;
  const processing = progress < 35 ? 'Menghubungkan data operasional' : progress < 100 ? 'Memproses data operasional' : 'Sistem operasional siap';

  return <div className={`preloader fixed inset-0 z-[9999] isolate min-h-[100dvh] overflow-hidden bg-[#fefefe] text-[#163b70] transition-opacity duration-[400ms] ${fading ? 'pointer-events-none opacity-0' : 'opacity-100'}`} aria-hidden={fading} aria-busy="true" aria-label="Memuat aplikasi Distribusi Gas dan ORF" role="status">
    <div className="preloader-brand preloader-brand-left"><i /> <span>Energy<br />for a brighter<br />tomorrow</span></div>
    <div className="preloader-brand preloader-brand-right"><span>Pertamina<br />Nusantara Regas</span><i /></div>
    <div className="preloader-side preloader-side-left" aria-hidden="true"><b /><i /><em /></div><div className="preloader-side preloader-side-right" aria-hidden="true"><b /><i /><em /></div>
    <main className="preloader-center"><div className="preloader-orbits" aria-hidden="true"><div className="preloader-orbit preloader-orbit-one"><span className="preloader-dot dot-red" /></div><div className="preloader-orbit preloader-orbit-two"><span className="preloader-dot dot-blue" /><span className="preloader-dot dot-green" /></div></div>
      <div className="preloader-content"><Image src="/images/regas-.png" alt="Pertamina Nusantara Regas" width={340} height={107} priority className="preloader-logo" /><div className="preloader-system-title">Sistem Operasional</div><div className="preloader-system-subtitle">Distribusi Gas &amp; ORF</div><div className="preloader-segments" aria-label="Sistem sedang memproses"><i /><i /><i /></div><p className="preloader-processing">{processing}<span className="preloader-ellipsis">...</span></p><div className="preloader-progress-row" aria-label={`Kemajuan memuat ${progress} persen`}><div className="preloader-progress-track"><div className="preloader-progress-fill" style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong></div>
        <ol className="preloader-timeline" aria-label="Status persiapan sistem">{STEPS.map(([lineOne, lineTwo], index) => { const completed = index < activeStep; const current = index === activeStep && progress < 100; return <li key={lineOne} className={completed ? 'is-complete' : current ? 'is-current' : ''}><span className="preloader-step-icon">{completed && '✓'}</span><span>{lineOne}{lineTwo && <><br />{lineTwo}</>}</span></li>; })}</ol>
      </div></main><footer className="preloader-footer"><div className="preloader-footer-company"><span><i /><i /><i /></span><b />Pertamina Nusantara Regas</div><div>Reliable <b>•</b> Safe <b>•</b> Sustainable</div></footer>
  </div>;
}
