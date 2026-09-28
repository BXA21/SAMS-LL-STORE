import { apiError, apiOk, logServer, withinRateLimit } from '@/lib/apiHelpers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN = /^[a-f0-9]{48}$/;

/** Payment status for the checkout result page, keyed by the order's unguessable public token. */
export async function GET(request: Request) {
  const db = getSupabaseAdmin();
  if (!db) return apiError(503, 'SERVICE_UNAVAILABLE', 'Order status is temporarily unavailable.');

  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!TOKEN.test(token)) return apiError(400, 'INVALID_REQUEST', 'Invalid order reference.');

  if (!(await withinRateLimit(db, 'status', request, 60, 600))) {
    return apiError(429, 'RATE_LIMITED', 'Too many requests. Please wait a moment.');
  }

  const { data, error } = await db.rpc('get_order_status', { p_public_token: token });
  if (error) {
    logServer('order_status_failed', { message: error.message });
    return apiError(500, 'INTERNAL_ERROR', 'We could not load the order status.');
  }
  const order = Array.isArray(data) ? data[0] : null;
  if (!order) return apiError(404, 'NOT_FOUND', 'Order not found.');
  return apiOk(order);
}
