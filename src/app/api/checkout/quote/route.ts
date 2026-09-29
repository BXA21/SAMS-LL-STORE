import { apiError, apiOk, enforceRateLimit, readJson } from '@/lib/apiHelpers';
import { createOrder } from '@/lib/orderFactory';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { checkoutSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Quotation / invoice request from the cart. Priced on the server exactly like a card order. */
export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  if (!db) {
    return apiError(503, 'SERVICE_UNAVAILABLE', 'Quotation requests are temporarily unavailable. Please contact us on WhatsApp.');
  }

  const body = await readJson(request, checkoutSchema);
  if (!body.ok) return body.response;

  const limit = await enforceRateLimit(db, 'quote', request, 6, 600);
  if (!limit.ok) return limit.response;

  const created = await createOrder(db, body.value, 'quotation');
  if (!created.ok) return created.response;

  return apiOk(
    {
      orderNumber: created.order.order_number,
      totalAmount: created.order.total_amount,
      currency: 'OMR',
    },
    201
  );
}
