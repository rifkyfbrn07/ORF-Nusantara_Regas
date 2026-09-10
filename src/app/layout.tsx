import type { Metadata } from 'next';
import './globals.css';
import './theme.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export const metadata: Metadata = {
  title: 'Distribusi Gas & ORF — Operational Workforce & Shift Management',
  description: 'Sistem manajemen tenaga kerja operasional, penjadwalan shift, dan monitoring manpower Distribusi Gas & ORF (Onshore Receiving Facility).',
};

const themeInitScript = `(() => { try { const stored = localStorage.getItem('orf-theme'); const theme = stored === 'dark' || stored === 'light' ? stored : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); document.documentElement.dataset.theme = theme; document.documentElement.classList.toggle('dark', theme === 'dark'); } catch {} })()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased bg-[#F5F7FA] text-slate-900 min-h-screen">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
