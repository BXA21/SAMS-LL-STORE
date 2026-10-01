import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { logServer } from '@/lib/apiHelpers';
import { runRecovery } from '@/lib/recoveryWorker';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
// Hard cap on billed execution time if a downstream call hangs.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** Secrets that may invoke the worker: our own, and the one Vercel Cron sends. */
function workerSecrets(): string[] {
  return [process.env.RECOVERY_WORKER_SECRET, process.env.CRON_SECRET].filter(
    (s): s is string => typeof s === 'string' && s.length >= 32
  );
}

function matches(presented: string, secret: string): boolean {
  const a = crypto.createHash('sha256').update(presented).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

function authorized(request: Request, secrets: string[]): boolean {
  const header = request.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!presented) return false;
  // Evaluate every candidate so timing does not reveal which secret matched.
  return secrets.map((secret) => matches(presented, secret)).some(Boolean);
}

/**
 * Runs one recovery pass. Vercel Cron calls it with GET every few minutes
 * (vercel.json) sending `Authorization: Bearer <CRON_SECRET>`; operators can
 * POST with `Bearer <RECOVERY_WORKER_SECRET>`. Each pass is idempotent, so a
 * duplicated or missed cron delivery is harmless. Secrets under 32 characters
 * are ignored, and with none configured the endpoint is disabled.
 */
async function handle(request: Request) {
  const secrets = workerSecrets();
  if (secrets.length === 0) {
    return NextResponse.json({ error: 'recovery worker not configured' }, { status: 503 });
  }
  if (!authorized(request, secrets)) {
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

export const GET = handle;
export const POST = handle;
