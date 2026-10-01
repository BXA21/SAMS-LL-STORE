import { apiError, apiOk, enforceRateLimit, logServer } from '@/lib/apiHelpers';
import { readOrderAccessToken } from '@/lib/orderAccess';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
// Hard cap on billed execution time if a downstream call hangs.
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

/**
 * Payment status of the buyer's own most recent card order, identified by the
 * HttpOnly order-access cookie set at checkout (never a URL parameter).
 * Returns status and total only.
 */
export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  if (!db) return apiError(503, 'SERVICE_UNAVAILABLE', 'Order status is temporarily unavailable.');

  const token = readOrderAccessToken(request);
  if (!token) return apiError(404, 'NOT_FOUND', 'No recent order was found in this browser.');

  const limit = await enforceRateLimit(db, 'status', request, 60, 600);
  if (!limit.ok) return limit.response;

  // A buyer waiting on the result page is exactly when a stranded payment
  // callback matters: finish any stored-but-unprocessed callbacks first.
  const { error: sweepError } = await db.rpc('process_pending_paymob_callbacks', { p_limit: 5 });
  if (sweepError) logServer('order_status_sweep_failed', { message: sweepError.message.slice(0, 200) });

  const { data, error } = await db.rpc('get_order_status', { p_public_token: token });
  if (error) {
    logServer('order_status_failed', { message: error.message.slice(0, 200) });
    return apiError(500, 'INTERNAL_ERROR', 'We could not load the order status.');
  }
  const order = Array.isArray(data) ? data[0] : null;
  if (!order) return apiError(404, 'NOT_FOUND', 'No recent order was found in this browser.');
  return apiOk(order);
}
