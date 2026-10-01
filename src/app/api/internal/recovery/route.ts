import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { logServer } from '@/lib/apiHelpers';
import { runRecovery } from '@/lib/recoveryWorker';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request): boolean {
  const secret = process.env.RECOVERY_WORKER_SECRET;
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = crypto.createHash('sha256').update(presented).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b) && presented.length > 0;
}

/**
 * Runs one recovery pass. Called by the Netlify scheduled function
 * (netlify/functions/recovery-worker.mts) or manually on a branch deploy.
 * Requires `Authorization: Bearer <RECOVERY_WORKER_SECRET>`.
 */
export async function POST(request: Request) {
  if (!process.env.RECOVERY_WORKER_SECRET) {
    return NextResponse.json({ error: 'recovery worker not configured' }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: 'database not configured' }, { status: 503 });

  const report = await runRecovery(db);
  logServer('recovery_run', {
    callbacks: report.callbacksProcessed,
    released: report.reservationsReleased,
    refunds: report.refunds,
    notifications: report.notifications,
    errors: report.errors.length,
  });
  return NextResponse.json(report, { status: report.errors.length ? 500 : 200, headers: { 'Cache-Control': 'no-store' } });
}
