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

/** Prices and persists an order through the create_checkout_order database function. */
export async function createOrder(
  db: SupabaseClient,
  input: CheckoutInput,
  type: 'online' | 'quotation'
): Promise<{ ok: true; order: CreatedOrder } | { ok: false; response: NextResponse }> {
  const { data, error } = await db.rpc('create_checkout_order', {
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
  });

  if (error) {
    if (error.message.startsWith('PRODUCT_NOT_FOUND')) {
      return {
        ok: false,
        response: apiError(409, 'PRODUCT_NOT_FOUND', 'One of the products in your cart is no longer available. Please refresh your cart.'),
      };
    }
    logServer('create_order_failed', { type, message: error.message });
    return { ok: false, response: apiError(500, 'INTERNAL_ERROR', 'We could not save your order. Please try again.') };
  }

  const row = (Array.isArray(data) ? data[0] : data) as CreatedOrder | undefined;
  if (!row) {
    logServer('create_order_empty', { type });
    return { ok: false, response: apiError(500, 'INTERNAL_ERROR', 'We could not save your order. Please try again.') };
  }
  return { ok: true, order: { ...row, total_amount: Number(row.total_amount), total_minor: Number(row.total_minor) } };
}
