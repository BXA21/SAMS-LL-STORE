import 'server-only';
import type { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { apiError, logServer } from '@/lib/apiHelpers';
import type { CheckoutInput } from '@/lib/validation';

export interface CreatedOrder {
  order_id: string;
  order_number: string;
  public_token: string;
  total_amount: number;
  total_minor: number;
}

/**
 * Prices, persists and (for card orders) reserves stock in one database
 * transaction via create_checkout_order_v2. `checkoutKey` makes a double
 * submit of the same checkout a no-op instead of a second order.
 */
export async function createOrder(
  db: SupabaseClient,
  input: CheckoutInput,
  type: 'online' | 'quotation',
  checkoutKey: string | null = null,
  clientKey: string | null = null
): Promise<{ ok: true; order: CreatedOrder } | { ok: false; response: NextResponse }> {
  const { data, error } = await db.rpc('create_checkout_order_v2', {
    p_customer: {
      full_name: input.customer.fullName,
      email: input.customer.email,
      phone: input.customer.phone,
      address: input.customer.address,
      company_name: input.customer.companyName ?? '',
      notes: input.customer.notes ?? '',
    },
    p_items: input.items,
    p_order_type: type,
    p_checkout_key: checkoutKey,
    p_client_key: clientKey,
  });

  if (error) {
    if (error.message.startsWith('PRODUCT_NOT_FOUND')) {
      return {
        ok: false,
        response: apiError(409, 'PRODUCT_NOT_FOUND', 'One of the products in your cart is no longer available. Please refresh your cart.'),
      };
    }
    if (error.message.startsWith('OUT_OF_STOCK')) {
      const slug = error.message.split(':')[1] ?? '';
      return {
        ok: false,
        response: apiError(
          409,
          'OUT_OF_STOCK',
          'Sorry, one of the products in your cart is not available in that quantity right now. You can reduce the quantity or send a quotation request and our team will confirm availability.',
          { product: slug.slice(0, 120) }
        ),
      };
    }
    // Two simultaneous submits can both pass the pre-check; the unique index then decides.
    if (error.message.startsWith('DUPLICATE_CHECKOUT') || (error.code === '23505' && error.message.includes('orders_checkout_key_key'))) {
      return {
        ok: false,
        response: apiError(
          409,
          'DUPLICATE_CHECKOUT',
          'This checkout was already submitted. Please finish paying in the Paymob page that opened, or start a new checkout from your cart.'
        ),
      };
    }
    if (error.message.startsWith('CARD_QUANTITY_LIMIT')) {
      return {
        ok: false,
        response: apiError(409, 'CARD_QUANTITY_LIMIT', 'Online card orders are limited to 50 units. For larger quantities, please send a quotation request and our team will prepare it for you.'),
      };
    }
    if (error.message.startsWith('TOO_MANY_OPEN_CHECKOUTS')) {
      return {
        ok: false,
        response: apiError(429, 'RATE_LIMITED', 'You already have several checkouts waiting for payment. Please complete or wait for one of them to expire (about 35 minutes), or contact us on WhatsApp.'),
      };
    }
    logServer('create_order_failed', { type, message: error.message.slice(0, 200) });
    return { ok: false, response: apiError(500, 'INTERNAL_ERROR', 'We could not save your order. Please try again.') };
  }

  const row = (Array.isArray(data) ? data[0] : data) as CreatedOrder | undefined;
  if (!row) {
    logServer('create_order_empty', { type });
    return { ok: false, response: apiError(500, 'INTERNAL_ERROR', 'We could not save your order. Please try again.') };
  }
  return { ok: true, order: { ...row, total_amount: Number(row.total_amount), total_minor: Number(row.total_minor) } };
}
