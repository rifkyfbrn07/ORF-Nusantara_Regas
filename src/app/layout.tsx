import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Distribusi Gas & ORF — Operational Workforce & Shift Management',
  description: 'Sistem manajemen tenaga kerja operasional, penjadwalan shift, dan monitoring manpower Distribusi Gas & ORF (Onshore Receiving Facility).',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased bg-[#F5F7FA] text-slate-900 min-h-screen">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
