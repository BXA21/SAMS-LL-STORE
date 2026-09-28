import crypto from 'crypto';
import { apiError, apiOk, logServer, readJson, withinRateLimit } from '@/lib/apiHelpers';
import { createIntention, PaymobError, unifiedCheckoutUrl } from '@/lib/paymob';
import { getPaymobConfig } from '@/lib/serverEnv';
import { getSiteUrl } from '@/lib/siteUrl';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { checkoutSchema } from '@/lib/validation';
import { createOrder } from '@/lib/orderFactory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ItemSnapshot {
  product_name: string;
  quantity: number;
  unit_price: number;
}

/**
 * Online card checkout.
 * Validate -> rate limit -> price and persist the order in Postgres -> create
 * a Paymob intention -> return the hosted Unified Checkout URL. The order is
 * marked paid later, only by an HMAC-verified Paymob callback.
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

  const body = await readJson(request, checkoutSchema);
  if (!body.ok) return body.response;

  if (!(await withinRateLimit(db, 'checkout', request, 8, 600))) {
    return apiError(429, 'RATE_LIMITED', 'Too many checkout attempts. Please wait a few minutes and try again.');
  }

  const created = await createOrder(db, body.value, 'online');
  if (!created.ok) return created.response;
  const order = created.order;

  const specialReference = `${order.order_number}-${crypto.randomBytes(3).toString('hex')}`;
  const { data: payment, error: paymentError } = await db
    .from('payments')
    .insert({ order_id: order.order_id, special_reference: specialReference, amount_minor: order.total_minor, currency: 'OMR' })
    .select('id')
    .single();
  if (paymentError || !payment) {
    logServer('checkout_payment_insert_failed', { order: order.order_number, message: paymentError?.message });
    return apiError(500, 'INTERNAL_ERROR', 'We could not start the payment. Please try again.');
  }

  const { data: orderRow } = await db.from('orders').select('items').eq('id', order.order_id).single();
  const snapshots = (orderRow?.items ?? []) as ItemSnapshot[];
  const items = snapshots.map((line) => ({
    name: line.product_name,
    amount: Math.round(Number(line.unit_price) * 1000),
    quantity: line.quantity,
  }));
  const itemsTotal = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
  const intentionItems =
    itemsTotal === order.total_minor ? items : [{ name: `SAMS order ${order.order_number}`, amount: order.total_minor, quantity: 1 }];

  const callbackBase = paymob.callbackBaseUrl ?? getSiteUrl();
  const siteBase = getSiteUrl();

  try {
    const intention = await createIntention(paymob, {
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
      redirectionUrl: `${siteBase}/api/paymob/return?token=${order.public_token}`,
    });

    await db
      .from('payments')
      .update({ intention_id: intention.id, provider_order_id: intention.intentionOrderId, status: 'pending' })
      .eq('id', payment.id);
    if (intention.intentionOrderId) {
      await db.from('orders').update({ paymob_order_id: intention.intentionOrderId }).eq('id', order.order_id);
    }

    logServer('checkout_intention_created', { order: order.order_number, reference: specialReference });
    return apiOk({
      orderNumber: order.order_number,
      paymentUrl: unifiedCheckoutUrl(paymob, intention.clientSecret),
    });
  } catch (err) {
    const detail = err instanceof PaymobError ? { status: err.status, detail: err.detail } : { message: String(err) };
    logServer('checkout_intention_failed', { order: order.order_number, ...detail });
    await db.from('payments').update({ status: 'error', last_error: JSON.stringify(detail).slice(0, 1000) }).eq('id', payment.id);
    await db.from('orders').update({ status: 'failed', payment_status: 'failed' }).eq('id', order.order_id);
    return apiError(502, 'PAYMENT_GATEWAY_ERROR', 'The payment gateway did not respond. You have not been charged. Please try again.');
  }
}
