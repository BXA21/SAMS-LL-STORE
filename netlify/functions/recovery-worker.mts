// Netlify Scheduled Function (NOT deployed or scheduled yet).
// Scheduled functions run automatically only on PUBLISHED deploys; on branch or
// deploy-preview builds, invoke /api/internal/recovery manually instead.
// It only calls the app's authenticated recovery endpoint, so all logic stays
// in src/lib/recoveryWorker.ts (tested locally).
export default async () => {
  const base = process.env.URL;
  const secret = process.env.RECOVERY_WORKER_SECRET;
  if (!base || !secret) return new Response('recovery worker not configured', { status: 503 });
  const res = await fetch(`${base}/api/internal/recovery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  });
  return new Response(null, { status: res.status });
};

export const config = {
  schedule: '*/5 * * * *',
};
