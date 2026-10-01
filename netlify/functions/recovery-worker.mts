// Netlify Scheduled Function: every 10 minutes, finish stranded Paymob
// callbacks, release expired checkouts and reconcile refunds by calling the
// app's authenticated recovery endpoint (all logic lives in
// src/lib/recoveryWorker.ts). Scheduled functions run only on the published
// production deploy; on previews, POST /api/internal/recovery manually.
export default async () => {
  const base = process.env.URL;
  const secret = process.env.RECOVERY_WORKER_SECRET;
  if (!base || !secret) return new Response('recovery worker not configured', { status: 503 });
  const res = await fetch(`${base}/api/internal/recovery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(25000),
  });
  return new Response(null, { status: res.status });
};

export const config = {
  schedule: '*/10 * * * *',
};
