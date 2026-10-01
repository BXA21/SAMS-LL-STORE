import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import {
  APP_LOG, APP_URL, assertIsolated, checkout, createTestProduct, deactivateProduct, mockControl, mockEmails, paymentFor,
  postWebhook, RECOVERY_SECRET, runRecovery, sql, STAFF_TEST_EMAIL, TEST_HMAC_SECRET, txn,
} from './harness.mjs';

assertIsolated();

const created = [];
after(() => created.forEach(deactivateProduct));

async function newPaidOrder(tag) {
  const p = createTestProduct({ stock: 10 });
  created.push(p.id);
  const r = await checkout([{ slug: p.slug, quantity: 1 }], { tag });
  const [pay] = await paymentFor(r.body.data.orderNumber);
  const t = txn({ providerOrderId: Number(pay.provider_order_id), reference: pay.special_reference, amount: 10000 });
  return { orderNumber: r.body.data.orderNumber, orderId: pay.order_id, t, email: `test.${tag}@example.com` };
}

const outbox = (orderId) => JSON.parse(sql(`select coalesce(json_agg(n order by event_type), '[]') from (select event_type, recipient, status, attempts from public.notification_outbox where order_id = '${orderId}') n;`));

test('one paid order = exactly one customer confirmation and one staff notification, even with duplicate webhooks', async () => {
  const o = await newPaidOrder('notif');
  await Promise.all(Array.from({ length: 6 }, () => postWebhook(o.t)));
  const rows = outbox(o.orderId);
  assert.deepEqual(rows.map((r) => [r.event_type, r.recipient]), [['order_paid_customer', o.email], ['order_paid_staff', 'staff']]);
  await runRecovery();
  await runRecovery();
  const sent = (await mockEmails()).filter((m) => m.subject.includes(o.orderNumber));
  assert.equal(sent.length, 2, 'one email per event, never repeated');
  const customerMail = sent.find((m) => m.to === o.email);
  const staffMail = sent.find((m) => m.to === STAFF_TEST_EMAIL);
  assert.ok(customerMail && staffMail, 'staff recipient comes from configuration, not the database');
  assert.match(customerMail.text, /products only/);
  assert.equal(customerMail.idempotencyHeader, `order_paid_customer:${o.orderId}`);
  assert.ok(outbox(o.orderId).every((r) => r.status === 'sent'));
});

test('email outage: the order is still paid; the notification is retried later and sent once', async () => {
  await mockControl({ emailFail: true });
  let o;
  try {
    o = await newPaidOrder('outage');
    assert.equal((await postWebhook(o.t)).body.outcome, 'paid');
    await runRecovery();
    assert.equal(sql(`select payment_status from public.orders where id = '${o.orderId}';`), 'successful');
    const rows = outbox(o.orderId);
    assert.ok(rows.every((r) => r.status === 'pending' && r.attempts === 1), JSON.stringify(rows));
  } finally {
    await mockControl({ emailFail: false });
  }
  sql(`update public.notification_outbox set next_attempt_at = now() - interval '1 second' where order_id = '${o.orderId}';`);
  await runRecovery();
  assert.ok(outbox(o.orderId).every((r) => r.status === 'sent'));
  assert.equal((await mockEmails()).filter((m) => m.subject.includes(o.orderNumber)).length, 2);
});

test('recovery endpoint: refuses without or with a wrong secret; accepts the right one', async () => {
  assert.equal((await runRecovery(null)).status, 401);
  assert.equal((await runRecovery('wrong-secret-wrong-secret-wrong-secret')).status, 401);
  const ok = await runRecovery(RECOVERY_SECRET);
  assert.equal(ok.status, 200);
  assert.deepEqual(Object.keys(ok.body).sort(), ['callbacksProcessed', 'errors', 'notifications', 'refunds', 'reservationsReleased']);
});

test('recovery worker finishes a stranded callback without any customer revisiting the site', async () => {
  const o = await newPaidOrder('stranded');
  sql(`alter function public.process_paymob_callback(uuid) rename to process_paymob_callback_disabled;`);
  try {
    assert.equal((await postWebhook(o.t)).status, 500);
  } finally {
    sql(`alter function public.process_paymob_callback_disabled(uuid) rename to process_paymob_callback;`);
  }
  sql(`update public.paymob_callbacks set received_at = now() - interval '1 minute' where transaction_id = '${o.t.id}';`);
  let rec;
  for (let i = 0; i < 20; i++) {
    rec = await runRecovery();
    if (sql(`select payment_status from public.orders where id = '${o.orderId}';`) === 'successful') break;
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.equal(sql(`select payment_status from public.orders where id = '${o.orderId}';`), 'successful');
  assert.equal(rec.status, 200);
});

test('server logs contain no customer emails, secrets, tokens or card data', async () => {
  const log = readFileSync(APP_LOG, 'utf8');
  assert.ok(log.length > 0, 'the app log was captured');
  for (const forbidden of [TEST_HMAC_SECRET, RECOVERY_SECRET, 'mock-api-key', 'mock-auth-token', 'omn_sk_test_localmock', 'sams_order_access=', STAFF_TEST_EMAIL]) {
    assert.ok(!log.includes(forbidden), `log must not contain ${forbidden.slice(0, 12)}...`);
  }
  assert.ok(!/test\.[a-z0-9]+@example\.com/i.test(log), 'no customer email addresses in logs');
  assert.ok(!/\b[a-f0-9]{48}\b/.test(log), 'no order-access tokens in logs');
});

test('customer status reflects server state: pending, then paid; refresh is stable; no cookie means nothing', async () => {
  const p = createTestProduct({ stock: 5 });
  created.push(p.id);
  const r = await checkout([{ slug: p.slug, quantity: 1 }], { tag: 'flow' });
  const cookie = r.setCookie.split(';')[0];
  const status = async () => (await (await fetch(`${APP_URL}/api/orders/status`, { method: 'POST', headers: { cookie } })).json()).data;
  assert.equal((await status()).payment_status, 'initiated', 'before Paymob answers: pending, not failed or paid');
  const [pay] = await paymentFor(r.body.data.orderNumber);
  await postWebhook(txn({ providerOrderId: Number(pay.provider_order_id), amount: 10000, pending: true, success: false }));
  assert.equal((await status()).payment_status, 'pending');
  await postWebhook(txn({ providerOrderId: Number(pay.provider_order_id), amount: 10000 }));
  assert.equal((await status()).payment_status, 'successful');
  assert.equal((await status()).payment_status, 'successful', 'refresh is stable');
  const bogus = await fetch(`${APP_URL}/api/orders/status?payment_status=successful&success=true`, { method: 'POST' });
  assert.equal(bogus.status, 404, 'query parameters never produce a status');
});

test('failed payment then retry with a new checkout: the retry succeeds and stock is not double-held', async () => {
  const p = createTestProduct({ stock: 1 });
  created.push(p.id);
  const first = await checkout([{ slug: p.slug, quantity: 1 }], { tag: 'retry1' });
  const [pay] = await paymentFor(first.body.data.orderNumber);
  await postWebhook(txn({ providerOrderId: Number(pay.provider_order_id), amount: 10000, success: false }));
  const second = await checkout([{ slug: p.slug, quantity: 1 }], { tag: 'retry2' });
  assert.equal(second.status, 200, 'the declined attempt released the last unit');
  const [pay2] = await paymentFor(second.body.data.orderNumber);
  assert.equal((await postWebhook(txn({ providerOrderId: Number(pay2.provider_order_id), amount: 10000 }))).body.outcome, 'paid');
});

test('REVIEW L4: notifications older than 7 days expire instead of flooding out', async () => {
  const o = await newPaidOrder('expired');
  await postWebhook(o.t);
  sql(`update public.notification_outbox set created_at = now() - interval '8 days' where order_id = '${o.orderId}';`);
  await runRecovery();
  const rows = outbox(o.orderId);
  assert.ok(rows.every((r) => r.status === 'failed'), JSON.stringify(rows));
  assert.equal((await mockEmails()).filter((m) => m.subject.includes(o.orderNumber)).length, 0);
});

test('payment alerts also queue a staff email (idempotent per alert)', async () => {
  const r = await postWebhook(txn({ providerOrderId: 777000111, reference: 'SAMS-NOPE-2', amount: 1234 }));
  assert.equal(r.body.outcome, 'unknown_payment');
  const alertId = sql(`select id from public.payment_alerts where message like '%777000111%';`);
  assert.equal(sql(`select count(*) from public.notification_outbox where idempotency_key = 'payment_alert_staff:${alertId}';`), '1');
});
