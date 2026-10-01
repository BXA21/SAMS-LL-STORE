import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  assertIsolated, checkout, createStaffUser, createTestProduct, deactivateProduct, mockControl, newTxnId, paymentFor,
  postWebhook, rest, runRecovery, sql, stack, stockOf, txn,
} from './harness.mjs';

assertIsolated();

const created = [];
let owner;
let sales;
const run = Date.now();
before(async () => {
  owner = await createStaffUser(`rf.owner.${run}@example.com`, 'Rf Owner', 'owner');
  sales = await createStaffUser(`rf.sales.${run}@example.com`, 'Rf Sales', 'sales');
});
after(() => created.forEach(deactivateProduct));

const asUser = (u) => ({ token: u.token, apikey: stack.anonKey });
const rpc = (u, fn, args) => rest(`rpc/${fn}`, { method: 'POST', body: args, ...asUser(u) });

/** A paid 20.000 OMR order (2 x 10.000) with its signed payment transaction. */
async function paidOrder(tag) {
  const p = createTestProduct({ stock: 10 });
  created.push(p.id);
  const r = await checkout([{ slug: p.slug, quantity: 2 }], { tag });
  const [pay] = await paymentFor(r.body.data.orderNumber);
  const t = txn({ providerOrderId: Number(pay.provider_order_id), reference: pay.special_reference, amount: 20000 });
  assert.equal((await postWebhook(t)).body.outcome, 'paid');
  return { orderNumber: r.body.data.orderNumber, pay, t, product: p };
}

/** Paymob's authoritative view, as returned by Transaction Inquiry (mocked). */
const inquiryOf = (t, patch = {}) => ({
  id: t.id, amount_cents: t.amount_cents, currency: 'OMR', success: true, pending: false,
  is_refund: false, is_refunded: false, refunded_amount_cents: 0, is_void: false, is_voided: false,
  parent_transaction: null, has_parent_transaction: false, order: { id: t.order.id }, ...patch,
});

/** A signed callback for a refund child transaction (has_parent_transaction is a signed field). */
function refundCallback(parent, amount) {
  const child = txn({ id: newTxnId(), providerOrderId: parent.order.id, amount });
  child.has_parent_transaction = true;
  return child;
}

const order = (n) => JSON.parse(sql(`select row_to_json(o) from (select payment_status, refunded_minor, total_minor, status, inventory_state from public.orders where order_number = '${n}') o;`));
const refundRows = (n) => JSON.parse(sql(`select coalesce(json_agg(json_build_object('kind', kind, 'amount_minor', amount_minor, 'cumulative_refunded_minor', cumulative_refunded_minor) order by created_at, id), '[]') from public.payment_refunds where order_id = (select id from public.orders where order_number = '${n}');`));

test('full refund: verified with Paymob, recorded as its own fact, original payment untouched', async () => {
  const o = await paidOrder('fullref');
  const child = refundCallback(o.t, 20000);
  await mockControl({ transactions: {
    [o.t.id]: inquiryOf(o.t, { is_refunded: true, refunded_amount_cents: 20000 }),
    [child.id]: inquiryOf(child, { is_refund: true, parent_transaction: String(o.t.id), has_parent_transaction: true }),
  } });
  const w = await postWebhook(child);
  assert.equal(w.body.outcome, 'refund_verification_queued');
  assert.equal(order(o.orderNumber).payment_status, 'successful', 'nothing changes before verification');
  const rec = await runRecovery();
  assert.equal(rec.body.refunds.verified, 1);
  assert.deepEqual(refundRows(o.orderNumber), [{ kind: 'refund', amount_minor: 20000, cumulative_refunded_minor: 20000 }]);
  assert.deepEqual({ ...order(o.orderNumber) }, { payment_status: 'refunded', refunded_minor: 20000, total_minor: 20000, status: 'paid', inventory_state: 'committed' });
  assert.equal(sql(`select status || '/' || amount_minor from public.payments where id = '${o.pay.id}';`), 'successful/20000', 'original payment is never rewritten');
});

test('partial then second partial refund: gross 20, refunds 8, net 12', async () => {
  const o = await paidOrder('partial');
  const first = refundCallback(o.t, 5000);
  await mockControl({ transactions: {
    [o.t.id]: inquiryOf(o.t, { is_refunded: true, refunded_amount_cents: 5000 }),
    [first.id]: inquiryOf(first, { is_refund: true, parent_transaction: String(o.t.id), has_parent_transaction: true }),
  } });
  await postWebhook(first);
  await runRecovery();
  assert.equal(order(o.orderNumber).payment_status, 'partially_refunded');
  const second = refundCallback(o.t, 3000);
  await mockControl({ transactions: {
    [o.t.id]: inquiryOf(o.t, { is_refunded: true, refunded_amount_cents: 8000 }),
    [second.id]: inquiryOf(second, { is_refund: true, parent_transaction: String(o.t.id), has_parent_transaction: true }),
  } });
  await postWebhook(second);
  await runRecovery();
  assert.deepEqual(refundRows(o.orderNumber).map((r) => r.amount_minor), [5000, 3000]);
  assert.equal(order(o.orderNumber).refunded_minor, 8000);
  assert.equal(order(o.orderNumber).payment_status, 'partially_refunded');
  const orderId = sql(`select id from public.orders where order_number = '${o.orderNumber}';`);
  const paidAt = sql(`select paid_at from public.orders where id = '${orderId}';`);
  const rep = await rpc(owner, 'get_sales_report', { p_from: new Date(new Date(paidAt).getTime() - 1000).toISOString(), p_to: new Date(new Date(paidAt).getTime() + 1000).toISOString() });
  assert.equal(rep.status, 200);
  // Other tests may pay orders in the same window; check this order's share and the identity.
  assert.ok(Number(rep.body.gross) >= 20);
  assert.ok(Number(rep.body.refunds) >= 8);
  assert.equal(Math.round((Number(rep.body.gross) - Number(rep.body.refunds)) * 1000), Math.round(Number(rep.body.revenue) * 1000), 'gross - refunds = net');
  assert.equal(sql(`select sum(amount_minor) from public.payment_refunds where order_id = '${orderId}';`), '8000');
  assert.equal(sql(`select total_minor - refunded_minor from public.orders where id = '${orderId}';`), '12000', 'order net = 12.000');
});

test('duplicate refund callbacks and a second report of the same total never double count', async () => {
  const o = await paidOrder('dupref');
  const child = refundCallback(o.t, 4000);
  await mockControl({ transactions: {
    [o.t.id]: inquiryOf(o.t, { is_refunded: true, refunded_amount_cents: 4000 }),
    [child.id]: inquiryOf(child, { is_refund: true, parent_transaction: String(o.t.id), has_parent_transaction: true }),
  } });
  await Promise.all([postWebhook(child), postWebhook(child), postWebhook(child)]);
  assert.equal(sql(`select count(*) from public.paymob_callbacks where transaction_id = '${child.id}';`), '1');
  // Paymob may also re-send the ORIGINAL transaction flagged is_refunded.
  const original = { ...o.t, is_refunded: true };
  await postWebhook(original);
  await runRecovery();
  await runRecovery();
  assert.deepEqual(refundRows(o.orderNumber).map((r) => r.amount_minor), [4000]);
  assert.equal(order(o.orderNumber).refunded_minor, 4000);
});

test('void: whole payment reversed, recorded as a void, original kept', async () => {
  const o = await paidOrder('void');
  const voidCb = { ...o.t, is_voided: true };
  await mockControl({ transactions: { [o.t.id]: inquiryOf(o.t, { is_voided: true }) } });
  assert.equal((await postWebhook(voidCb)).body.outcome, 'refund_verification_queued');
  await runRecovery();
  assert.deepEqual(refundRows(o.orderNumber), [{ kind: 'void', amount_minor: 20000, cumulative_refunded_minor: 20000 }]);
  assert.equal(order(o.orderNumber).payment_status, 'voided');
});

test('refund reported before its payment is applied waits, then applies (out of order)', async () => {
  const p = createTestProduct({ stock: 5 });
  created.push(p.id);
  const r = await checkout([{ slug: p.slug, quantity: 2 }], { tag: 'ooo' });
  const [pay] = await paymentFor(r.body.data.orderNumber);
  const t = txn({ providerOrderId: Number(pay.provider_order_id), reference: pay.special_reference, amount: 20000 });
  const child = refundCallback(t, 6000);
  await mockControl({ transactions: {
    [t.id]: inquiryOf(t, { is_refunded: true, refunded_amount_cents: 6000 }),
    [child.id]: inquiryOf(child, { is_refund: true, parent_transaction: String(t.id), has_parent_transaction: true }),
  } });
  await postWebhook(child);
  const early = await runRecovery();
  assert.equal(early.body.refunds.deferred + early.body.refunds.failed >= 1, true);
  assert.equal(order(r.body.data.orderNumber).refunded_minor, 0);
  assert.equal((await postWebhook(t)).body.outcome, 'paid');
  sql(`update public.refund_verifications set next_attempt_at = now() - interval '1 second' where transaction_id = '${child.id}';`);
  await runRecovery();
  assert.equal(order(r.body.data.orderNumber).payment_status, 'partially_refunded');
  assert.equal(order(r.body.data.orderNumber).refunded_minor, 6000);
});

test('stale payment callbacks after a refund change nothing', async () => {
  const o = await paidOrder('stale');
  const child = refundCallback(o.t, 5000);
  await mockControl({ transactions: {
    [o.t.id]: inquiryOf(o.t, { is_refunded: true, refunded_amount_cents: 5000 }),
    [child.id]: inquiryOf(child, { is_refund: true, parent_transaction: String(o.t.id), has_parent_transaction: true }),
  } });
  await postWebhook(child);
  await runRecovery();
  // An identical replay of the original payment callback returns its stored outcome and changes nothing.
  const replay = await postWebhook(o.t);
  assert.equal(replay.status, 200);
  assert.equal(sql(`select count(*) from public.paymob_callbacks where transaction_id = '${o.t.id}' and not is_refunded;`), '1');
  assert.equal((await postWebhook(txn({ providerOrderId: o.t.order.id, amount: 20000, success: false }))).body.outcome, 'ignored_after_paid');
  assert.equal((await postWebhook(txn({ providerOrderId: o.t.order.id, amount: 20000, pending: true, success: false }))).body.outcome, 'ignored_stale_pending');
  assert.equal(order(o.orderNumber).payment_status, 'partially_refunded');
  assert.equal(order(o.orderNumber).refunded_minor, 5000);
});

test('a refund larger than the payment is rejected and alerted', async () => {
  const o = await paidOrder('toobig');
  await mockControl({ transactions: { [o.t.id]: inquiryOf(o.t, { is_refunded: true, refunded_amount_cents: 99999 }) } });
  await postWebhook({ ...o.t, is_refunded: true });
  await runRecovery();
  assert.deepEqual(refundRows(o.orderNumber), []);
  assert.equal(sql(`select count(*) from public.payment_alerts where kind = 'refund_inconsistent' and order_id = (select id from public.orders where order_number = '${o.orderNumber}');`), '1');
});

test('an unverifiable refund report is retried, then alerted, never applied', async () => {
  const o = await paidOrder('unverif');
  const orphan = refundCallback(o.t, 1000); // no inquiry data -> Paymob "404"
  await postWebhook(orphan);
  await runRecovery();
  assert.equal(sql(`select status || '/' || attempts from public.refund_verifications where transaction_id = '${orphan.id}';`), 'pending/1');
  sql(`update public.refund_verifications set attempts = 8, next_attempt_at = now() - interval '1 second' where transaction_id = '${orphan.id}';`);
  await runRecovery();
  assert.equal(sql(`select status from public.refund_verifications where transaction_id = '${orphan.id}';`), 'failed');
  assert.ok(Number(sql(`select count(*) from public.payment_alerts where kind = 'refund_verification_failed' and message like '%${orphan.id}%';`)) >= 1);
  assert.equal(order(o.orderNumber).refunded_minor, 0);
});

test('a refund never restocks; returning items is an explicit, idempotent owner action', async () => {
  const o = await paidOrder('restock');
  const before = stockOf(o.product.id);
  await mockControl({ transactions: { [o.t.id]: inquiryOf(o.t, { is_refunded: true, refunded_amount_cents: 20000 }) } });
  await postWebhook({ ...o.t, is_refunded: true });
  await runRecovery();
  assert.deepEqual(stockOf(o.product.id), before, 'refund did not touch stock');

  const orderId = sql(`select id from public.orders where order_number = '${o.orderNumber}';`);
  const key = `return-key-${Date.now()}-x`;
  const args = { p_order_id: orderId, p_product_id: o.product.id, p_quantity: 1, p_reason: 'Customer returned one unit', p_idempotency_key: key };
  assert.ok((await rpc(sales, 'owner_return_to_stock', args)).status >= 400, 'sales cannot restock');
  assert.equal((await rpc(owner, 'owner_return_to_stock', args)).status, 204);
  assert.equal((await rpc(owner, 'owner_return_to_stock', args)).status, 204, 'repeat with the same key is a no-op');
  assert.equal(stockOf(o.product.id).onHand, before.onHand + 1);
  const tooMany = await rpc(owner, 'owner_return_to_stock', { ...args, p_quantity: 5, p_idempotency_key: `${key}-2` });
  assert.ok(tooMany.status >= 400, 'cannot return more than was sold');
  assert.equal(sql(`select actor_role || '/' || reason from public.inventory_movements where kind = 'return_to_stock' and order_id = '${orderId}';`), 'owner/Customer returned one unit');
});

test('refund data visibility: staff read refunds; verification queue is owner-only; nobody writes directly', async () => {
  assert.equal((await rest('payment_refunds?select=id&limit=1', asUser(sales))).status, 200);
  const q = await rest('refund_verifications?select=id&limit=5', asUser(sales));
  assert.ok(q.status >= 400 || q.body.length === 0);
  const write = await rest('payment_refunds', { method: 'POST', body: { kind: 'refund' }, ...asUser(owner) });
  assert.ok(write.status >= 400);
  const fn = await rpc(owner, 'apply_refund_reconciliation', { p_verification_id: '00000000-0000-0000-0000-000000000000', p_parent: {}, p_source_transaction_id: '1' });
  assert.ok(fn.status >= 400);
});

test('REVIEW M1: refunding a duplicate charge reconciles against that capture; the order stays paid', async () => {
  const o = await paidOrder('dupcharge');
  const second = txn({ providerOrderId: o.t.order.id, amount: 20000 });
  assert.equal((await postWebhook(second)).body.outcome, 'duplicate_charge');
  assert.equal(sql(`select count(*) from public.payments where order_id = '${o.pay.order_id}' and status = 'successful';`), '2', 'the extra capture is its own payment fact');
  await mockControl({ transactions: { [second.id]: inquiryOf(second, { is_refunded: true, refunded_amount_cents: 20000 }) } });
  await postWebhook({ ...second, is_refunded: true });
  const rec = await runRecovery();
  assert.equal(rec.body.refunds.verified, 1);
  assert.equal(order(o.orderNumber).payment_status, 'successful', 'one capture remains: fully paid');
  assert.equal(order(o.orderNumber).refunded_minor, 20000);
});

test('REVIEW L1: an older (smaller) cumulative report after a newer one is not a false alarm', async () => {
  const o = await paidOrder('stalecum');
  await mockControl({ transactions: { [o.t.id]: inquiryOf(o.t, { is_refunded: true, refunded_amount_cents: 8000 }) } });
  await postWebhook({ ...o.t, is_refunded: true, created_at: '2026-09-29T10:00:01.000000' });
  await runRecovery();
  await mockControl({ transactions: { [o.t.id]: inquiryOf(o.t, { is_refunded: true, refunded_amount_cents: 5000 }) } });
  await postWebhook({ ...o.t, is_refunded: true, created_at: '2026-09-29T10:00:02.000000' });
  await runRecovery();
  assert.equal(order(o.orderNumber).refunded_minor, 8000);
  const orderId = sql(`select id from public.orders where order_number = '${o.orderNumber}';`);
  assert.equal(sql(`select count(*) from public.payment_alerts where order_id = '${orderId}' and kind = 'refund_inconsistent';`), '0');
});
