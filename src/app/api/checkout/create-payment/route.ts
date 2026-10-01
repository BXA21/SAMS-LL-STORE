import crypto from 'crypto';
import { apiError, apiOk, enforceRateLimit, logServer, readJson } from '@/lib/apiHelpers';
import { clientIdentity, rateLimitKey } from '@/lib/clientIp';
import { ORDER_ACCESS_COOKIE, orderAccessCookieOptions } from '@/lib/orderAccess';
import { createIntention, PaymobError, unifiedCheckoutUrl } from '@/lib/paymob';
import { getPaymobConfig } from '@/lib/serverEnv';
import { getSiteUrl } from '@/lib/siteUrl';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { cardCheckoutSchema, checkoutKeySchema } from '@/lib/validation';
import { createOrder } from '@/lib/orderFactory';

export const runtime = 'nodejs';
// Hard cap on billed execution time if a downstream call hangs.
export const maxDuration = 20;
export const dynamic = 'force-dynamic';

interface ItemSnapshot {
  product_name: string;
  quantity: number;
  unit_price: number | string;
}

/** OMR (3 decimals) to integer baisa via the decimal string, never float multiplication. */
function omrToBaisa(value: number | string): number {
  const [whole, fraction = ''] = (typeof value === 'number' ? value.toFixed(3) : value).split('.');
  return Number(whole) * 1000 + Number(fraction.padEnd(3, '0').slice(0, 3));
}

/**
 * Online card checkout.
 * Validate -> rate limit (fail closed) -> price and persist the order in
 * Postgres -> create a payment attempt -> create the Paymob intention ->
 * durably bind the attempt to Paymob's (signed) order id -> only then return
 * the hosted checkout URL. Payment state changes only via the signed webhook.
 */
export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  const paymob = getPaymobConfig();
  if (!db || !paymob) {
    return apiError(
      503,
      'ONLINE_PAYMENT_UNAVAILABLE',
      'Online card payment is not available right now. Please submit a quotation request and our sales team will contact you.'
    );
  }

  const body = await readJson(request, cardCheckoutSchema);
  if (!body.ok) return body.response;

  const limit = await enforceRateLimit(db, 'checkout', request, 8, 600);
  if (!limit.ok) return limit.response;

  const key = checkoutKeySchema.safeParse(request.headers.get('idempotency-key'));
  const created = await createOrder(db, body.value, 'online', key.success ? key.data : null, rateLimitKey('checkout-owner', clientIdentity(request.headers)));
  if (!created.ok) return created.response;
  const order = created.order;

  const environment = paymob.secretKey.startsWith('omn_sk_live_') ? 'live' : 'test';
  const specialReference = `${order.order_number}-${crypto.randomBytes(3).toString('hex')}`;
  const { data: payment, error: paymentError } = await db
    .from('payments')
    .insert({
      order_id: order.order_id,
      special_reference: specialReference,
      amount_minor: order.total_minor,
      currency: 'OMR',
      integration_ids: paymob.integrationIds,
      environment,
    })
    .select('id')
    .single();
  if (paymentError || !payment) {
    logServer('checkout_payment_insert_failed', { order: order.order_number, message: paymentError?.message });
    return apiError(500, 'INTERNAL_ERROR', 'We could not start the payment. Please try again.');
  }

  const failAttempt = async (reason: string) => {
    await db.from('payments').update({ status: 'error', last_error: reason.slice(0, 300) }).eq('id', payment.id);
    await db.from('orders').update({ status: 'failed', payment_status: 'failed' }).eq('id', order.order_id).eq('payment_status', 'initiated');
    // The buyer never reached a payment page: give the reserved stock back now.
    const { error } = await db.rpc('release_order_reservations', { p_order_id: order.order_id, p_kind: 'release' });
    if (error) logServer('checkout_release_failed', { order: order.order_number, message: error.message.slice(0, 200) });
  };

  const { data: orderRow } = await db.from('orders').select('items').eq('id', order.order_id).single();
  const snapshots = (orderRow?.items ?? []) as ItemSnapshot[];
  const items = snapshots.map((line) => ({ name: line.product_name, amount: omrToBaisa(line.unit_price), quantity: line.quantity }));
  const itemsTotal = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
  const intentionItems =
    itemsTotal === order.total_minor ? items : [{ name: `SAMS order ${order.order_number}`, amount: order.total_minor, quantity: 1 }];

  const callbackBase = paymob.callbackBaseUrl ?? getSiteUrl();
  const siteBase = getSiteUrl();

  let intention;
  try {
    intention = await createIntention(paymob, {
      amountMinor: order.total_minor,
      currency: 'OMR',
      items: intentionItems,
      customer: {
        fullName: body.value.customer.fullName,
        email: body.value.customer.email,
        phone: body.value.customer.phone,
        address: body.value.customer.address,
      },
      specialReference,
      notificationUrl: `${callbackBase}/api/paymob/webhook`,
      redirectionUrl: `${siteBase}/api/paymob/return`,
    });
  } catch (err) {
    // Log only status/code; Paymob error bodies can echo customer billing data.
    const status = err instanceof PaymobError ? err.status : undefined;
    logServer('checkout_intention_failed', { order: order.order_number, status });
    await failAttempt(`Paymob intention failed${status ? ` (HTTP ${status})` : ''}`);
    return apiError(502, 'PAYMENT_GATEWAY_ERROR', 'The payment gateway did not respond. You have not been charged. Please try again.');
  }

  if (!intention.intentionOrderId) {
    logServer('checkout_intention_unbound', { order: order.order_number });
    await failAttempt('Paymob returned no order id to bind');
    return apiError(502, 'PAYMENT_GATEWAY_ERROR', 'The payment gateway did not respond correctly. You have not been charged. Please try again.');
  }

  // Bind this attempt to Paymob's order id exactly once, before the customer can pay.
  const { data: bound, error: bindError } = await db
    .from('payments')
    .update({ intention_id: intention.id, provider_order_id: intention.intentionOrderId, status: 'pending' })
    .eq('id', payment.id)
    .is('provider_order_id', null)
    .select('id');
  if (bindError || !bound || bound.length !== 1) {
    logServer('checkout_binding_failed', { order: order.order_number, message: bindError?.message?.slice(0, 200) });
    await failAttempt('Could not bind the payment attempt');
    return apiError(500, 'INTERNAL_ERROR', 'We could not start the payment. You have not been charged. Please try again.');
  }

  logServer('checkout_intention_created', { order: order.order_number, environment });
  const response = apiOk({
    orderNumber: order.order_number,
    paymentUrl: unifiedCheckoutUrl(paymob, intention.clientSecret),
  });
  response.cookies.set(ORDER_ACCESS_COOKIE, order.public_token, orderAccessCookieOptions());
  return response;
}
