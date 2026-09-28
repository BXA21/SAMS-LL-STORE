import { NextResponse } from 'next/server';
import { logServer } from '@/lib/apiHelpers';
import { normalizeCallback, verifyCallbackHmac } from '@/lib/paymob';
import { getPaymobConfig } from '@/lib/serverEnv';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Paymob "transaction processed" callback: the source of truth for payment.
 *
 * 1. Verify the HMAC-SHA512 signature (fail closed, constant time).
 * 2. Hand the normalized transaction to apply_paymob_transaction, which locks
 *    the order, ignores replays, checks the amount and currency against the
 *    order, and never moves a paid order backwards.
 *
 * Responses: 200 once handled (including duplicates and unknown references, so
 * Paymob stops retrying), 401 on a bad signature, 500 only on our own failure
 * so Paymob retries.
 */
export async function POST(request: Request) {
  const paymob = getPaymobConfig();
  const db = getSupabaseAdmin();
  if (!paymob || !db) {
    logServer('paymob_webhook_unconfigured');
    return NextResponse.json({ received: false }, { status: 503 });
  }

  const raw = await request.text();
  if (raw.length > 64 * 1024) return NextResponse.json({ received: false }, { status: 413 });

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  // Non-transaction callbacks (e.g. saved-card TOKEN) carry no payment state.
  if (payload.type !== 'TRANSACTION' || !payload.obj || typeof payload.obj !== 'object') {
    return NextResponse.json({ received: true, ignored: true });
  }
  const obj = payload.obj as Record<string, unknown>;

  const hmac = new URL(request.url).searchParams.get('hmac');
  if (!verifyCallbackHmac(paymob.hmacSecret, obj, hmac)) {
    logServer('paymob_webhook_bad_hmac', { transaction: String(obj.id ?? '') });
    return NextResponse.json({ received: false }, { status: 401 });
  }

  const txn = normalizeCallback(obj);
  if (!txn) return NextResponse.json({ received: false }, { status: 400 });

  const { data: outcome, error } = await db.rpc('apply_paymob_transaction', {
    p_special_reference: txn.specialReference,
    p_provider_order_id: txn.providerOrderId,
    p_transaction_id: txn.transactionId,
    p_amount_minor: txn.amountMinor,
    p_currency: txn.currency,
    p_success: txn.success,
    p_pending: txn.pending,
    p_payload: payload,
  });

  if (error) {
    logServer('paymob_webhook_apply_failed', { transaction: txn.transactionId, message: error.message });
    return NextResponse.json({ received: false }, { status: 500 });
  }

  logServer('paymob_webhook_applied', { transaction: txn.transactionId, reference: txn.specialReference, outcome });
  return NextResponse.json({ received: true, outcome });
}
