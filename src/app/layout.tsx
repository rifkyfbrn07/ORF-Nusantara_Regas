import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'REGAS FIELDOPS — Operator Workforce & Shift Management Platform',
  description: 'Enterprise operational workforce, shift planning, attendance tracking, and manpower monitoring system for energy facilities.',
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
