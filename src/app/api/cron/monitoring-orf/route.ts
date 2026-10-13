import { NextResponse } from 'next/server';
import {
  createCurrentHourlyMonitoringOrfSnapshot,
  logMonitoringOrfSchedulerFailure,
} from '@/server/services/infoOrfService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET belum dikonfigurasi.' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron trigger.' }, { status: 401 });
  }

  try {
    const result = await createCurrentHourlyMonitoringOrfSnapshot();
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    try {
      await logMonitoringOrfSchedulerFailure(error);
    } catch (loggingError: unknown) {
      console.error('Failed to persist Monitoring ORF scheduler failure log:', loggingError);
    }
    return NextResponse.json(
      { success: false, error: 'Gagal membuat pencatatan otomatis Monitoring ORF.' },
      { status: 500 }
    );
  }
}
