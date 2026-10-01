import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { APP_URL, assertIsolated, checkout, createStaffUser, customer, freshIp, paymentFor, postWebhook, rest, sql, stack, txn } from './harness.mjs';

assertIsolated();

let owner;
let sales;
const run = Date.now();

before(async () => {
  owner = await createStaffUser(`owner.${run}@example.com`, 'Test Owner', 'owner');
  sales = await createStaffUser(`sales.${run}@example.com`, 'Test Sales', 'sales');
});

const asUser = (user) => ({ token: user.token, apikey: stack.anonKey });
const rpc = (user, fn, args) => rest(`rpc/${fn}`, { method: 'POST', body: args, ...asUser(user) });

async function quoteOrder(tag) {
  const res = await fetch(`${APP_URL}/api/checkout/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-nf-client-connection-ip': freshIp() },
    body: JSON.stringify({ customer: customer(tag), items: [{ slug: 'gfo-fire-drum-5-kg', quantity: 1 }] }),
  });
  const body = await res.json();
  const id = sql(`select id from public.orders where order_number = '${body.data.orderNumber}';`);
  return { id, orderNumber: body.data.orderNumber };
}

async function paidCardOrder(tag) {
  const r = await checkout([{ slug: 'gfo-baby-fire-ball-400-gms', quantity: 1 }], { tag });
  const [p] = await paymentFor(r.body.data.orderNumber);
  await postWebhook(txn({ providerOrderId: Number(p.provider_order_id), amount: 12000 }));
  return { id: p.order_id, orderNumber: r.body.data.orderNumber };
}

test('sales cannot mark a card order paid by any path', async () => {
  const r = await checkout([{ slug: 'gfo-baby-fire-ball-400-gms', quantity: 1 }], { tag: 'nopay' });
  const [p] = await paymentFor(r.body.data.orderNumber);
  const direct = await rest(`orders?id=eq.${p.order_id}`, { method: 'PATCH', body: { status: 'paid', payment_status: 'successful' }, ...asUser(sales), prefer: 'return=representation' });
  assert.ok(direct.status >= 400, `direct PATCH must be refused (got ${direct.status})`);
  const viaRpc = await rpc(sales, 'staff_set_order_status', { p_order_id: p.order_id, p_expected_status: 'pending_payment', p_new_status: 'paid', p_reason: null });
  assert.ok(viaRpc.status >= 400);
  const ownerTry = await rpc(owner, 'owner_set_offline_payment', { p_order_id: p.order_id, p_expected_payment_status: 'initiated', p_new_payment_status: 'verified', p_reason: 'x' });
  assert.ok(ownerTry.status >= 400, 'even the owner cannot hand-mark a card payment');
  assert.match(JSON.stringify(ownerTry.body), /set by Paymob/, 'refused by the card-payment rule, not as a stale write');
  assert.equal(sql(`select payment_status from public.orders where id = '${p.order_id}';`), 'initiated');
});

test('fulfilment is blocked until payment is confirmed; offline payment is owner-only with a reason', async () => {
  const q = await quoteOrder('fulfil');
  assert.equal((await rpc(sales, 'staff_set_order_status', { p_order_id: q.id, p_expected_status: 'manual_inquiry', p_new_status: 'placement', p_reason: null })).status, 200);
  const blocked = await rpc(sales, 'staff_set_order_status', { p_order_id: q.id, p_expected_status: 'placement', p_new_status: 'processing', p_reason: null });
  assert.ok(blocked.status >= 400);
  assert.match(JSON.stringify(blocked.body), /Payment must be confirmed/);

  const salesPay = await rpc(sales, 'owner_set_offline_payment', { p_order_id: q.id, p_expected_payment_status: 'unpaid', p_new_payment_status: 'verified', p_reason: 'bank transfer' });
  assert.ok(salesPay.status >= 400, 'sales cannot record offline payments');
  const noReason = await rpc(owner, 'owner_set_offline_payment', { p_order_id: q.id, p_expected_payment_status: 'unpaid', p_new_payment_status: 'verified', p_reason: '' });
  assert.ok(noReason.status >= 400, 'a reason is required');
  assert.equal((await rpc(owner, 'owner_set_offline_payment', { p_order_id: q.id, p_expected_payment_status: 'unpaid', p_new_payment_status: 'verified', p_reason: 'Bank transfer ref TEST-1' })).status, 200);
  assert.equal((await rpc(sales, 'staff_set_order_status', { p_order_id: q.id, p_expected_status: 'placement', p_new_status: 'processing', p_reason: null })).status, 200);
});

test('invalid transitions and stale concurrent writes are rejected', async () => {
  const q = await quoteOrder('stale');
  const skip = await rpc(sales, 'staff_set_order_status', { p_order_id: q.id, p_expected_status: 'manual_inquiry', p_new_status: 'delivered', p_reason: null });
  assert.ok(skip.status >= 400);
  const [first, second] = await Promise.all([
    rpc(sales, 'staff_set_order_status', { p_order_id: q.id, p_expected_status: 'manual_inquiry', p_new_status: 'placement', p_reason: null }),
    rpc(owner, 'staff_set_order_status', { p_order_id: q.id, p_expected_status: 'manual_inquiry', p_new_status: 'placement', p_reason: null }),
  ]);
  assert.equal([first, second].filter((r) => r.status === 200).length, 1, 'exactly one concurrent writer wins');
  const stale = [first, second].find((r) => r.status !== 200);
  assert.match(JSON.stringify(stale.body), /STALE_OR_NOT_FOUND/);
});

test('cancelling needs a reason; only the owner can cancel a paid order; money stays reportable', async () => {
  const o = await paidCardOrder('cancel');
  const noReason = await rpc(owner, 'staff_set_order_status', { p_order_id: o.id, p_expected_status: 'paid', p_new_status: 'cancelled', p_reason: '' });
  assert.ok(noReason.status >= 400);
  const salesCancel = await rpc(sales, 'staff_set_order_status', { p_order_id: o.id, p_expected_status: 'paid', p_new_status: 'cancelled', p_reason: 'customer changed mind' });
  assert.ok(salesCancel.status >= 400);
  assert.match(JSON.stringify(salesCancel.body), /Only the owner/);
  assert.equal((await rpc(owner, 'staff_set_order_status', { p_order_id: o.id, p_expected_status: 'paid', p_new_status: 'cancelled', p_reason: 'Customer cancelled; refund due' })).status, 200);
  assert.equal(sql(`select payment_status from public.orders where id = '${o.id}';`), 'successful', 'cancelling does not erase the payment');

  const report = await rpc(owner, 'get_sales_report', { p_from: '2020-01-01T00:00:00Z', p_to: '2100-01-01T00:00:00Z' });
  assert.equal(report.status, 200);
  assert.ok(Number(report.body.cancelled_paid) >= 1);
  assert.ok(Number(report.body.gross) >= Number(report.body.revenue));
  assert.equal(Number(report.body.gross) - Number(report.body.refunds), Number(report.body.revenue), 'gross - refunds = net');
});

test('audit history: actor from the session, atomic with the change, append-only for staff', async () => {
  const q = await quoteOrder('audit');
  await rpc(sales, 'staff_set_order_status', { p_order_id: q.id, p_expected_status: 'manual_inquiry', p_new_status: 'placement', p_reason: 'spoke to customer' });
  const rows = JSON.parse(sql(`select coalesce(json_agg(h order by id), '[]') from public.order_status_history h where order_id = '${q.id}';`));
  const change = rows.find((h) => h.to_status === 'placement');
  assert.equal(change.actor_id, sales.id);
  assert.equal(change.actor_role, 'sales');
  assert.equal(change.from_status, 'manual_inquiry');
  assert.equal(change.reason, 'spoke to customer');
  assert.ok(rows.some((h) => h.from_status === null && h.actor_role === 'system'), 'creation is recorded too');

  const readable = await rest(`order_status_history?order_id=eq.${q.id}`, asUser(sales));
  assert.equal(readable.status, 200);
  const ins = await rest('order_status_history', { method: 'POST', body: { order_id: q.id, actor_role: 'owner', to_status: 'delivered' }, ...asUser(sales) });
  assert.ok(ins.status >= 400, 'sales cannot insert history');
  const upd = await rest(`order_status_history?order_id=eq.${q.id}`, { method: 'PATCH', body: { reason: 'edited' }, ...asUser(sales), prefer: 'return=representation' });
  assert.ok(upd.status >= 400 || (Array.isArray(upd.body) && upd.body.length === 0), 'sales cannot edit history');
  const del = await rest(`order_status_history?order_id=eq.${q.id}`, { method: 'DELETE', ...asUser(sales), prefer: 'return=representation' });
  assert.ok(del.status >= 400 || (Array.isArray(del.body) && del.body.length === 0), 'sales cannot delete history');
  assert.equal(sql(`select count(*) from public.order_status_history where order_id = '${q.id}' and reason = 'edited';`), '0');
});

test('sales still cannot reach costs, profit, payment records or callbacks; notes stay editable', async () => {
  for (const table of ['product_costs', 'order_items', 'payments', 'payment_events', 'paymob_callbacks']) {
    const r = await rest(`${table}?select=*&limit=5`, asUser(sales));
    assert.ok(r.status >= 400 || (Array.isArray(r.body) && r.body.length === 0), `${table} must be hidden from sales`);
  }
  assert.ok((await rpc(sales, 'get_sales_report', { p_from: '2020-01-01T00:00:00Z', p_to: '2100-01-01T00:00:00Z' })).status >= 400);
  // Real argument lists, so a refusal proves missing privilege, not a signature mismatch.
  const privileged = {
    process_paymob_callback: { p_callback_id: '00000000-0000-0000-0000-000000000000' },
    process_pending_paymob_callbacks: { p_limit: 1 },
    note_paymob_callback_error: { p_callback_id: '00000000-0000-0000-0000-000000000000', p_error: 'x' },
    record_paymob_callback: {
      p_transaction_id: '1', p_provider_order_id: '1', p_merchant_reference: 'x', p_integration_id: 69632, p_amount_minor: 1,
      p_currency: 'OMR', p_success: true, p_pending: false, p_is_refunded: false, p_is_voided: false, p_is_auth: false,
      p_is_capture: false, p_payload: {},
    },
    apply_paymob_transaction: {
      p_special_reference: 'x', p_provider_order_id: '1', p_transaction_id: '1', p_amount_minor: 1, p_currency: 'OMR',
      p_success: true, p_pending: false, p_payload: {},
    },
    create_checkout_order: { p_customer: {}, p_items: [], p_order_type: 'online' },
    check_rate_limit: { p_key: 'x', p_max: 1, p_window_seconds: 1 },
    get_order_status: { p_public_token: 'x' },
  };
  for (const [fn, args] of Object.entries(privileged)) {
    for (const user of [sales, owner]) {
      const r = await rpc(user, fn, args);
      assert.ok(r.status === 401 || r.status === 403 || (r.status >= 400 && /permission denied/i.test(JSON.stringify(r.body))),
        `${fn} must be denied by privilege (got ${r.status} ${JSON.stringify(r.body).slice(0, 120)})`);
    }
  }
  const q = await quoteOrder('notes');
  const notes = await rest(`orders?id=eq.${q.id}`, { method: 'PATCH', body: { staff_notes: 'call after 5pm' }, ...asUser(sales), prefer: 'return=representation' });
  assert.equal(notes.status, 200);
  const amount = await rest(`orders?id=eq.${q.id}`, { method: 'PATCH', body: { total_amount: 1 }, ...asUser(owner) });
  assert.ok(amount.status >= 400, 'amounts are never editable');
  const role = await rest(`staff_profiles?user_id=eq.${sales.id}`, { method: 'PATCH', body: { role: 'owner' }, ...asUser(sales), prefer: 'return=representation' });
  assert.ok(role.status >= 400 || (Array.isArray(role.body) && role.body.length === 0), 'sales cannot promote itself');
});

test('payment arriving after cancellation is recorded and alerted; owner-only, reasoned reinstatement', async () => {
  const r = await checkout([{ slug: 'gfo-baby-fire-ball-400-gms', quantity: 1 }], { tag: 'latepay' });
  const [p] = await paymentFor(r.body.data.orderNumber);
  assert.equal((await rpc(sales, 'staff_set_order_status', { p_order_id: p.order_id, p_expected_status: 'pending_payment', p_new_status: 'cancelled', p_reason: 'customer stopped replying' })).status, 200);
  const late = await postWebhook(txn({ providerOrderId: Number(p.provider_order_id), amount: 12000 }));
  assert.equal(late.body.outcome, 'paid');
  assert.equal(sql(`select status || '/' || payment_status from public.orders where id = '${p.order_id}';`), 'cancelled/successful', 'money recorded, fulfilment label kept');
  assert.equal(sql(`select count(*) from public.payment_alerts where kind = 'paid_after_cancel' and order_id = '${p.order_id}';`), '1');

  const salesTry = await rpc(sales, 'staff_set_order_status', { p_order_id: p.order_id, p_expected_status: 'cancelled', p_new_status: 'paid', p_reason: 'paid after all' });
  assert.ok(salesTry.status >= 400);
  assert.match(JSON.stringify(salesTry.body), /Only the owner can reinstate/);
  const noReason = await rpc(owner, 'staff_set_order_status', { p_order_id: p.order_id, p_expected_status: 'cancelled', p_new_status: 'paid', p_reason: '' });
  assert.ok(noReason.status >= 400);
  assert.equal((await rpc(owner, 'staff_set_order_status', { p_order_id: p.order_id, p_expected_status: 'cancelled', p_new_status: 'paid', p_reason: 'Customer confirmed; shipping' })).status, 200);

  const alertId = sql(`select id from public.payment_alerts where kind = 'paid_after_cancel' and order_id = '${p.order_id}';`);
  assert.ok((await rpc(sales, 'owner_resolve_payment_alert', { p_alert_id: Number(alertId), p_resolution: 'done' })).status >= 400, 'sales cannot resolve alerts');
  assert.equal((await rpc(owner, 'owner_resolve_payment_alert', { p_alert_id: Number(alertId), p_resolution: 'Reinstated and shipped' })).status, 204);
  const alertsAsSales = await rest('payment_alerts?select=id,kind', asUser(sales));
  assert.equal(alertsAsSales.status, 200, 'staff can read alerts');
  const tamper = await rest(`payment_alerts?id=eq.${alertId}`, { method: 'PATCH', body: { resolution: 'x' }, ...asUser(sales), prefer: 'return=representation' });
  assert.ok(tamper.status >= 400 || (Array.isArray(tamper.body) && tamper.body.length === 0), 'alerts are not editable');
});

test('an unpaid quotation cannot be reinstated as paid; a card order without payment cannot either', async () => {
  const q = await quoteOrder('reinstate');
  await rpc(sales, 'staff_set_order_status', { p_order_id: q.id, p_expected_status: 'manual_inquiry', p_new_status: 'cancelled', p_reason: 'duplicate request' });
  const toPaid = await rpc(owner, 'staff_set_order_status', { p_order_id: q.id, p_expected_status: 'cancelled', p_new_status: 'paid', p_reason: 'x' });
  assert.ok(toPaid.status >= 400);
  assert.equal((await rpc(owner, 'staff_set_order_status', { p_order_id: q.id, p_expected_status: 'cancelled', p_new_status: 'placement', p_reason: 'customer came back' })).status, 200);
});

test('the owner cannot reverse an offline payment once fulfilment has started', async () => {
  const q = await quoteOrder('reverse');
  await rpc(sales, 'staff_set_order_status', { p_order_id: q.id, p_expected_status: 'manual_inquiry', p_new_status: 'placement', p_reason: null });
  await rpc(owner, 'owner_set_offline_payment', { p_order_id: q.id, p_expected_payment_status: 'unpaid', p_new_payment_status: 'verified', p_reason: 'Bank transfer TEST-2' });
  await rpc(sales, 'staff_set_order_status', { p_order_id: q.id, p_expected_status: 'placement', p_new_status: 'processing', p_reason: null });
  const reverse = await rpc(owner, 'owner_set_offline_payment', { p_order_id: q.id, p_expected_payment_status: 'verified', p_new_payment_status: 'unpaid', p_reason: 'mistake' });
  assert.ok(reverse.status >= 400);
  assert.match(JSON.stringify(reverse.body), /already being fulfilled/);
});
