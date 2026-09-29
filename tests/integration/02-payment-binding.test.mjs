import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  APP_URL, assertIsolated, checkout, orderState, paymentFor, postWebhook, rest, setMockPaymobFailure, sql, txn,
} from './harness.mjs';

assertIsolated();

const CART = [{ slug: 'gfo-baby-fire-ball-400-gms', quantity: 2 }]; // 24.000 OMR

async function newCardOrder(tag) {
  const r = await checkout(CART, { tag });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const [payment] = await paymentFor(r.body.data.orderNumber);
  return { orderNumber: r.body.data.orderNumber, payment, cookie: r.setCookie };
}

test('checkout binds the attempt to the signed Paymob order id before returning the URL', async () => {
  const o = await newCardOrder('bind');
  assert.ok(o.payment.provider_order_id, 'provider order id stored');
  assert.equal(o.payment.status, 'pending');
  assert.deepEqual(o.payment.integration_ids, [69632]);
  assert.equal(o.payment.environment, 'test');
  assert.equal(o.payment.amount_minor, 24000);
  assert.equal(o.payment.orders.total_minor, 24000);
});

test('REGRESSION: a valid payment for A plus a reference pointing to B never pays B (or A)', async () => {
  const a = await newCardOrder('A');
  const b = await newCardOrder('B');
  const forged = txn({ providerOrderId: Number(a.payment.provider_order_id), reference: b.payment.special_reference, amount: 24000 });
  const r = await postWebhook(forged);
  assert.equal(r.status, 200);
  assert.equal(r.body.outcome, 'reference_mismatch');
  assert.equal((await orderState(a.orderNumber)).payment_status, 'initiated');
  assert.equal((await orderState(b.orderNumber)).payment_status, 'initiated');
});

test('a signed payment for A with no merchant reference settles A only', async () => {
  const a = await newCardOrder('A2');
  const b = await newCardOrder('B2');
  const r = await postWebhook(txn({ providerOrderId: Number(a.payment.provider_order_id), reference: undefined, amount: 24000 }));
  assert.equal(r.body.outcome, 'paid');
  assert.equal((await orderState(a.orderNumber)).payment_status, 'successful');
  assert.equal((await orderState(b.orderNumber)).payment_status, 'initiated');
});

test('one Paymob transaction can never pay a second order', async () => {
  const a = await newCardOrder('X1');
  const b = await newCardOrder('X2');
  const t = txn({ providerOrderId: Number(a.payment.provider_order_id), reference: a.payment.special_reference, amount: 24000 });
  assert.equal((await postWebhook(t)).body.outcome, 'paid');
  const reused = { ...t, order: { id: Number(b.payment.provider_order_id), merchant_order_id: b.payment.special_reference } };
  const r = await postWebhook(reused);
  assert.equal(r.status, 200);
  // Treated as a replay of the stored callback (which paid A); nothing new is applied.
  assert.equal(sql(`select count(*) from public.paymob_callbacks where transaction_id = '${t.id}';`), '1');
  assert.equal((await orderState(b.orderNumber)).payment_status, 'initiated');
  assert.equal((await orderState(a.orderNumber)).paymob_transaction_id, String(t.id));
});

test('unknown provider order, wrong amount, wrong currency, wrong integration: never paid', async () => {
  const unknown = await postWebhook(txn({ providerOrderId: 123, reference: 'SAMS-NOPE', amount: 24000 }));
  assert.equal(unknown.status, 200);
  assert.equal(unknown.body.outcome, 'unknown_payment');

  const o1 = await newCardOrder('amt');
  assert.equal((await postWebhook(txn({ providerOrderId: Number(o1.payment.provider_order_id), amount: 2400 }))).body.outcome, 'amount_mismatch');
  assert.notEqual((await orderState(o1.orderNumber)).payment_status, 'successful');

  const o2 = await newCardOrder('cur');
  assert.equal((await postWebhook(txn({ providerOrderId: Number(o2.payment.provider_order_id), amount: 24000, currency: 'EGP' }))).body.outcome, 'amount_mismatch');
  assert.notEqual((await orderState(o2.orderNumber)).payment_status, 'successful');

  const o3 = await newCardOrder('int');
  assert.equal((await postWebhook(txn({ providerOrderId: Number(o3.payment.provider_order_id), amount: 24000, integration: 11111 }))).body.outcome, 'integration_mismatch');
  assert.notEqual((await orderState(o3.orderNumber)).payment_status, 'successful');
});

test('invalid or missing signature: 401 and nothing stored', async () => {
  const o = await newCardOrder('sig');
  const t = txn({ providerOrderId: Number(o.payment.provider_order_id), amount: 24000 });
  const before = sql(`select count(*) from public.paymob_callbacks;`);
  assert.equal((await postWebhook(t, { hmac: 'a'.repeat(128) })).status, 401);
  assert.equal((await postWebhook(t, { hmac: '' })).status, 401);
  const tampered = { ...t };
  const sig = (await import('./harness.mjs')).signCallback(t);
  tampered.amount_cents = 1;
  assert.equal((await postWebhook(tampered, { hmac: sig })).status, 401);
  assert.equal(sql(`select count(*) from public.paymob_callbacks;`), before);
  assert.equal((await orderState(o.orderNumber)).payment_status, 'initiated');
});

test('duplicate and concurrent callbacks have exactly one financial effect', async () => {
  const o = await newCardOrder('dup');
  const t = txn({ providerOrderId: Number(o.payment.provider_order_id), reference: o.payment.special_reference, amount: 24000 });
  const results = await Promise.all(Array.from({ length: 10 }, () => postWebhook(t)));
  assert.ok(results.every((r) => r.status === 200));
  assert.equal(sql(`select count(*) from public.paymob_callbacks where transaction_id = '${t.id}';`), '1');
  assert.equal(sql(`select count(*) from public.payment_events where provider_transaction_id = '${t.id}';`), '1');
  const s = await orderState(o.orderNumber);
  assert.equal(s.payment_status, 'successful');
  assert.equal(s.paymob_transaction_id, String(t.id));
  assert.equal(sql(`select count(*) from public.order_status_history h join public.orders o on o.id = h.order_id where o.order_number = '${o.orderNumber}' and h.to_payment_status = 'successful' and h.from_payment_status <> 'successful';`), '1');
});

test('failure followed by success -> paid; success followed by delayed failure -> stays paid', async () => {
  const o = await newCardOrder('fs');
  const po = Number(o.payment.provider_order_id);
  assert.equal((await postWebhook(txn({ providerOrderId: po, amount: 24000, success: false }))).body.outcome, 'failed');
  assert.equal((await orderState(o.orderNumber)).payment_status, 'failed');
  assert.equal((await postWebhook(txn({ providerOrderId: po, amount: 24000 }))).body.outcome, 'paid');
  assert.equal((await orderState(o.orderNumber)).payment_status, 'successful');
  assert.equal((await postWebhook(txn({ providerOrderId: po, amount: 24000, success: false }))).body.outcome, 'ignored_after_paid');
  const s = await orderState(o.orderNumber);
  assert.equal(s.payment_status, 'successful');
  assert.equal(s.status, 'paid');
});

test('a second, different successful charge is recorded as duplicate_charge and flagged, not re-applied', async () => {
  const o = await newCardOrder('dc');
  const po = Number(o.payment.provider_order_id);
  const first = txn({ providerOrderId: po, amount: 24000 });
  await postWebhook(first);
  const second = await postWebhook(txn({ providerOrderId: po, amount: 24000 }));
  assert.equal(second.body.outcome, 'duplicate_charge');
  const s = await orderState(o.orderNumber);
  assert.equal(s.paymob_transaction_id, String(first.id));
  assert.equal(sql(`select provider_transaction_id || '/' || status from public.payments where id = '${o.payment.id}';`), `${first.id}/successful`, 'successful record untouched');
  assert.equal(sql(`select count(*) from public.payment_alerts where kind = 'duplicate_charge' and order_id = '${o.payment.order_id}';`), '1');
});

test('concurrent DIFFERENT successful transactions on one order: one pays, the other is a flagged duplicate', async () => {
  const o = await newCardOrder('concurrent');
  const po = Number(o.payment.provider_order_id);
  const [x, y] = await Promise.all([postWebhook(txn({ providerOrderId: po, amount: 24000 })), postWebhook(txn({ providerOrderId: po, amount: 24000 }))]);
  assert.deepEqual([x.body.outcome, y.body.outcome].sort(), ['duplicate_charge', 'paid']);
  assert.equal(sql(`select count(*) from public.payment_alerts where kind = 'duplicate_charge' and order_id = '${o.payment.order_id}';`), '1');
  assert.equal((await orderState(o.orderNumber)).payment_status, 'successful');
});

test('a late success with a WRONG amount on a paid order never overwrites the successful record', async () => {
  const o = await newCardOrder('latemismatch');
  const po = Number(o.payment.provider_order_id);
  const good = txn({ providerOrderId: po, amount: 24000 });
  await postWebhook(good);
  const late = await postWebhook(txn({ providerOrderId: po, amount: 1 }));
  assert.equal(late.body.outcome, 'duplicate_charge');
  assert.equal(sql(`select status from public.payments where id = '${o.payment.id}';`), 'successful');
  assert.equal((await orderState(o.orderNumber)).paymob_transaction_id, String(good.id));
});

test('an unmatched real capture raises a payment alert for staff', async () => {
  const r = await postWebhook(txn({ providerOrderId: 42424242, reference: 'SAMS-UNKNOWN', amount: 5000 }));
  assert.equal(r.body.outcome, 'unknown_payment');
  assert.equal(sql(`select count(*) from public.payment_alerts where kind = 'unknown_payment' and message like '%42424242%';`), '1');
});

test('multiple attempts for one order: an old attempt failing never overrides a newer attempt', async () => {
  const o = await newCardOrder('retry');
  const oldPo = Number(o.payment.provider_order_id);
  const newPo = oldPo + 500000;
  await rest('payments', {
    method: 'POST',
    body: { order_id: o.payment.order_id, special_reference: `${o.orderNumber}-retry1`, amount_minor: 24000, currency: 'OMR', provider_order_id: String(newPo), status: 'pending', integration_ids: [69632], environment: 'test' },
    prefer: 'return=minimal',
  });
  assert.equal((await postWebhook(txn({ providerOrderId: oldPo, amount: 24000, success: false }))).body.outcome, 'failed_superseded');
  assert.equal((await orderState(o.orderNumber)).payment_status, 'initiated');
  assert.equal((await postWebhook(txn({ providerOrderId: newPo, amount: 24000 }))).body.outcome, 'paid');
  const rows = await paymentFor(o.orderNumber);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].provider_order_id, String(oldPo), 'earlier binding untouched');
});

test('refund / void callbacks are recorded and flagged without changing payment state (Phase 2)', async () => {
  const o = await newCardOrder('rf');
  const po = Number(o.payment.provider_order_id);
  await postWebhook(txn({ providerOrderId: po, amount: 24000 }));
  const r = await postWebhook(txn({ providerOrderId: po, amount: 24000, refunded: true }));
  assert.equal(r.body.outcome, 'refund_or_void_recorded');
  const s = await orderState(o.orderNumber);
  assert.equal(s.payment_status, 'successful');
  assert.equal(sql(`select count(*) from public.payment_alerts where kind = 'refund_or_void' and order_id = '${o.payment.order_id}';`), '1');
});

test('redirect tampering changes nothing and carries no data forward', async () => {
  const o = await newCardOrder('redir');
  const res = await fetch(`${APP_URL}/api/paymob/return?success=true&pending=false&id=1&order=${o.payment.provider_order_id}&hmac=${'b'.repeat(128)}`, { redirect: 'manual' });
  assert.equal(res.status, 303);
  assert.equal(new URL(res.headers.get('location')).pathname + new URL(res.headers.get('location')).search, '/checkout/result');
  assert.equal((await orderState(o.orderNumber)).payment_status, 'initiated');
});

async function deferredCallback(tag) {
  const o = await newCardOrder(tag);
  const t = txn({ providerOrderId: Number(o.payment.provider_order_id), reference: o.payment.special_reference, amount: 24000 });
  sql(`alter function public.process_paymob_callback(uuid) rename to process_paymob_callback_disabled;`);
  let r;
  try {
    r = await postWebhook(t);
  } finally {
    sql(`alter function public.process_paymob_callback_disabled(uuid) rename to process_paymob_callback;`);
  }
  return { o, t, r };
}

async function retryUntilOk(fn) {
  let result;
  for (let attempt = 0; attempt < 20; attempt++) {
    result = await fn();
    if (result.status === 200) return result;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return result;
}

test('processing failure after durable receipt: NOT acknowledged (500), stored, and a Paymob retry completes it', async () => {
  const { o, t, r } = await deferredCallback('dbfail');
  assert.equal(r.status, 500, 'not acknowledged as handled');
  assert.equal(r.body.deferred, true);
  assert.equal(sql(`select status from public.paymob_callbacks where transaction_id = '${t.id}';`), 'received', 'receipt is durable');
  assert.equal((await orderState(o.orderNumber)).payment_status, 'initiated');
  const retry = await retryUntilOk(() => postWebhook(t));
  assert.equal(retry.body.outcome, 'paid');
  assert.equal(sql(`select count(*) from public.paymob_callbacks where transaction_id = '${t.id}';`), '1');
  assert.equal((await orderState(o.orderNumber)).payment_status, 'successful');
});

test('a stranded callback is completed by the customer status poll (no new webhook needed)', async () => {
  const { o, t } = await deferredCallback('sweep');
  sql(`update public.paymob_callbacks set received_at = now() - interval '1 minute' where transaction_id = '${t.id}';`);
  const cookie = o.cookie.split(';')[0];
  const status = await retryUntilOk(() => fetch(`${APP_URL}/api/orders/status`, { method: 'POST', headers: { cookie } }).then(async (res) => ({ status: res.status, body: await res.json() })));
  assert.equal(status.status, 200);
  assert.equal(sql(`select status from public.paymob_callbacks where transaction_id = '${t.id}';`), 'processed');
  assert.equal((await orderState(o.orderNumber)).payment_status, 'successful');
});

test('database failure before receipt: 500 (Paymob retries) and no state change', async () => {
  const o = await newCardOrder('rcptfail');
  const t = txn({ providerOrderId: Number(o.payment.provider_order_id), amount: 24000 });
  sql(`alter function public.record_paymob_callback(text, text, text, integer, bigint, text, boolean, boolean, boolean, boolean, boolean, boolean, jsonb) rename to record_paymob_callback_disabled;`);
  let r;
  try {
    r = await postWebhook(t);
  } finally {
    sql(`alter function public.record_paymob_callback_disabled(text, text, text, integer, bigint, text, boolean, boolean, boolean, boolean, boolean, boolean, jsonb) rename to record_paymob_callback;`);
  }
  assert.equal(r.status, 500);
  assert.equal((await orderState(o.orderNumber)).payment_status, 'initiated');
  // Paymob retries failed callbacks; the API needs a moment to see the restored function.
  let retry;
  for (let attempt = 0; attempt < 20; attempt++) {
    retry = await postWebhook(t);
    if (retry.status === 200) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.equal(retry.body.outcome, 'paid', 'the retried callback succeeds');
  assert.equal((await orderState(o.orderNumber)).payment_status, 'successful');
});

test('gateway failure at checkout: no URL, order marked failed, customer not charged', async () => {
  await setMockPaymobFailure(true);
  let r;
  try {
    r = await checkout(CART, { tag: 'gwfail' });
  } finally {
    await setMockPaymobFailure(false);
  }
  assert.equal(r.status, 502);
  assert.equal(r.setCookie, null);
  const latest = sql(`select status || '/' || payment_status from public.orders where email = 'test.gwfail@example.com' order by created_at desc limit 1;`);
  assert.equal(latest, 'failed/failed');
});
