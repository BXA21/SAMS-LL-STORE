import { NextResponse } from 'next/server';
import { logServer } from '@/lib/apiHelpers';
import { normalizeCallback, verifyCallbackHmac } from '@/lib/paymob';
import { getPaymobConfig } from '@/lib/serverEnv';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
// Hard cap on billed execution time if a downstream call hangs.
export const maxDuration = 20;
export const dynamic = 'force-dynamic';

/**
 * Paymob "transaction processed" callback: the only path that changes payment state.
 *
 * 1. Verify the HMAC-SHA512 signature (fail closed, constant time).
 * 2. Durably store the verified callback (paymob_callbacks). If that fails we
 *    answer 500 so Paymob retries; nothing was acknowledged.
 * 3. Process it: the payment is resolved ONLY by the signed Paymob order id
 *    bound at checkout; amount, currency and integration must match; replays
 *    are idempotent and a paid order is never moved backwards.
 * 4. If processing fails after durable receipt, answer 500 so Paymob retries;
 *    the recovery sweep also finishes stored-but-unprocessed callbacks.
 *
 * Not rate limited: payment confirmations must not depend on any client limit.
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
    logServer('paymob_webhook_bad_hmac');
    return NextResponse.json({ received: false }, { status: 401 });
  }

  const txn = normalizeCallback(obj);
  if (!txn) return NextResponse.json({ received: false }, { status: 400 });

  const { data: callbackId, error: recordError } = await db.rpc('record_paymob_callback', {
    p_transaction_id: txn.transactionId,
    p_provider_order_id: txn.providerOrderId,
    p_merchant_reference: txn.merchantReference,
    p_integration_id: txn.integrationId,
    p_amount_minor: txn.amountMinor,
    p_currency: txn.currency,
    p_success: txn.success,
    p_pending: txn.pending,
    p_is_refunded: txn.isRefunded,
    p_is_voided: txn.isVoided,
    p_is_auth: txn.isAuth,
    p_is_capture: txn.isCapture,
    p_payload: payload,
  });

  if (recordError || typeof callbackId !== 'string') {
    logServer('paymob_webhook_receipt_failed', { transaction: txn.transactionId, message: recordError?.message?.slice(0, 200) });
    return NextResponse.json({ received: false }, { status: 500 });
  }

  const { data: outcome, error: processError } = await db.rpc('process_paymob_callback', { p_callback_id: callbackId });
  if (processError) {
    // The event is durably stored, but it is NOT acknowledged as handled:
    // answer 500 so Paymob retries (processing is idempotent), and the sweep
    // (run by later webhooks and by the customer's status polling) also retries it.
    await db.rpc('note_paymob_callback_error', { p_callback_id: callbackId, p_error: processError.message });
    logServer('paymob_webhook_processing_deferred', { transaction: txn.transactionId, message: processError.message.slice(0, 200) });
    return NextResponse.json({ received: true, deferred: true }, { status: 500 });
  }

  // Best-effort recovery of any earlier callbacks whose processing failed.
  const { error: sweepError } = await db.rpc('process_pending_paymob_callbacks', { p_limit: 10 });
  if (sweepError) logServer('paymob_webhook_sweep_failed', { message: sweepError.message.slice(0, 200) });

  logServer('paymob_webhook_processed', { transaction: txn.transactionId, outcome });
  return NextResponse.json({ received: true, outcome });
}
