import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  APP_URL, assertIsolated, checkout, createStaffUser, createTestProduct, deactivateProduct, freshIp, paymentFor,
  postWebhook, rest, runRecovery, sql, stack, stockOf, txn,
} from './harness.mjs';

assertIsolated();

const created = [];
const product = (opts) => { const p = createTestProduct(opts); created.push(p.id); return p; };
let owner;
let sales;
const run = Date.now();
before(async () => {
  owner = await createStaffUser(`inv.owner.${run}@example.com`, 'Inv Owner', 'owner');
  sales = await createStaffUser(`inv.sales.${run}@example.com`, 'Inv Sales', 'sales');
});
after(() => created.forEach(deactivateProduct));

const asUser = (u) => ({ token: u.token, apikey: stack.anonKey });
const rpc = (u, fn, args) => rest(`rpc/${fn}`, { method: 'POST', body: args, ...asUser(u) });
const buy = (slug, quantity = 1, opts = {}) => checkout([{ slug, quantity }], opts);

async function paid(orderNumber, amountMinor) {
  const [p] = await paymentFor(orderNumber);
  const t = txn({ providerOrderId: Number(p.provider_order_id), reference: p.special_reference, amount: amountMinor });
  return { p, t, r: await postWebhook(t) };
}

test('final unit: 20 concurrent buyers, exactly one reservation succeeds', async () => {
  const p = product({ stock: 1 });
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => buy(p.slug, 1, { ip: freshIp(), tag: `race${i}` })));
  const ok = results.filter((r) => r.status === 200);
  const soldOut = results.filter((r) => r.status === 409 && r.body?.error?.code === 'OUT_OF_STOCK');
  assert.equal(ok.length, 1, `exactly one checkout may proceed (got ${ok.length})`);
  assert.equal(soldOut.length, 19);
  assert.deepEqual(stockOf(p.id), { onHand: 1, reserved: 1, available: 0 });
  assert.equal(sql(`select count(*) from public.inventory_reservations where product_id = '${p.id}' and status = 'active';`), '1');
});

test('quantity greater than stock is refused and creates no order', async () => {
  const p = product({ stock: 2 });
  const r = await buy(p.slug, 3, { tag: 'toomany' });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'OUT_OF_STOCK');
  assert.equal(sql(`select count(*) from public.orders o, jsonb_array_elements(o.items) i where i ->> 'product_slug' = '${p.slug}';`), '0');
  assert.deepEqual(stockOf(p.id), { onHand: 2, reserved: 0, available: 2 });
});

test('expired reservation is released by the recovery worker', async () => {
  const p = product({ stock: 2 });
  const r = await buy(p.slug, 1, { tag: 'expire' });
  assert.equal(r.status, 200);
  assert.deepEqual(stockOf(p.id), { onHand: 2, reserved: 1, available: 1 });
  sql(`update public.inventory_reservations set expires_at = now() - interval '1 minute' where product_id = '${p.id}';`);
  const rec = await runRecovery();
  assert.equal(rec.status, 200);
  assert.ok(rec.body.reservationsReleased >= 1);
  assert.deepEqual(stockOf(p.id), { onHand: 2, reserved: 0, available: 2 });
  assert.equal(sql(`select status from public.inventory_reservations where product_id = '${p.id}';`), 'expired');
});

test('failed payment releases the reservation', async () => {
  const p = product({ stock: 2 });
  const r = await buy(p.slug, 2, { tag: 'failrel' });
  const [pay] = await paymentFor(r.body.data.orderNumber);
  assert.deepEqual(stockOf(p.id), { onHand: 2, reserved: 2, available: 0 });
  const w = await postWebhook(txn({ providerOrderId: Number(pay.provider_order_id), amount: 20000, success: false }));
  assert.equal(w.body.outcome, 'failed');
  assert.deepEqual(stockOf(p.id), { onHand: 2, reserved: 0, available: 2 });
});

test('paid order deducts stock exactly once, even with concurrent duplicate callbacks', async () => {
  const p = product({ stock: 5 });
  const r = await buy(p.slug, 2, { tag: 'once' });
  const [pay] = await paymentFor(r.body.data.orderNumber);
  const t = txn({ providerOrderId: Number(pay.provider_order_id), reference: pay.special_reference, amount: 20000 });
  const results = await Promise.all(Array.from({ length: 8 }, () => postWebhook(t)));
  assert.ok(results.every((x) => x.status === 200));
  assert.deepEqual(stockOf(p.id), { onHand: 3, reserved: 0, available: 3 });
  assert.equal(sql(`select count(*) from public.inventory_movements where product_id = '${p.id}' and kind = 'sale';`), '1');
  assert.equal(sql(`select inventory_state from public.orders where order_number = '${r.body.data.orderNumber}';`), 'committed');
});

test('late payment after expiry when the unit was resold: recorded, alerted, never oversold', async () => {
  const p = product({ stock: 1 });
  const a = await buy(p.slug, 1, { tag: 'lateA' });
  sql(`update public.inventory_reservations set expires_at = now() - interval '1 minute' where product_id = '${p.id}';`);
  await runRecovery();
  const b = await buy(p.slug, 1, { tag: 'lateB' });
  assert.equal(b.status, 200, 'the released unit can be bought by someone else');
  const { r } = await paid(a.body.data.orderNumber, 10000);
  assert.equal(r.body.outcome, 'paid', 'the payment itself is recorded');
  const aState = sql(`select payment_status || '/' || inventory_state from public.orders where order_number = '${a.body.data.orderNumber}';`);
  assert.equal(aState, 'successful/shortfall');
  assert.deepEqual(stockOf(p.id), { onHand: 1, reserved: 1, available: 0 }, 'B keeps its reservation; nothing oversold');
  assert.equal(sql(`select count(*) from public.payment_alerts a join public.orders o on o.id = a.order_id where o.order_number = '${a.body.data.orderNumber}' and a.kind = 'stock_shortfall';`), '1');
  const aId = sql(`select id from public.orders where order_number = '${a.body.data.orderNumber}';`);
  const ship = await rpc(owner, 'staff_set_order_status', { p_order_id: aId, p_expected_status: 'paid', p_new_status: 'processing', p_reason: null });
  assert.ok(ship.status >= 400, 'a shortfall order cannot be fulfilled');
});

test('late payment after expiry when stock is still free: sold from available stock', async () => {
  const p = product({ stock: 3 });
  const a = await buy(p.slug, 1, { tag: 'lateFree' });
  sql(`update public.inventory_reservations set expires_at = now() - interval '1 minute' where product_id = '${p.id}';`);
  await runRecovery();
  await paid(a.body.data.orderNumber, 10000);
  assert.deepEqual(stockOf(p.id), { onHand: 2, reserved: 0, available: 2 });
  assert.equal(sql(`select count(*) from public.inventory_movements where product_id = '${p.id}' and kind = 'late_sale';`), '1');
});

test('cancelling an unpaid order releases its reservation', async () => {
  const p = product({ stock: 2 });
  const r = await buy(p.slug, 1, { tag: 'cancelrel' });
  const id = sql(`select id from public.orders where order_number = '${r.body.data.orderNumber}';`);
  const c = await rpc(sales, 'staff_set_order_status', { p_order_id: id, p_expected_status: 'pending_payment', p_new_status: 'cancelled', p_reason: 'customer changed mind' });
  assert.equal(c.status, 200);
  assert.deepEqual(stockOf(p.id), { onHand: 2, reserved: 0, available: 2 });
});

test('owner stock adjustment: stale-safe, validated, audited', async () => {
  const p = product({ stock: 4 });
  const ok = await rpc(owner, 'owner_set_stock', { p_product_id: p.id, p_expected_on_hand: 4, p_new_on_hand: 9, p_track_inventory: true, p_low_stock_threshold: 2, p_reason: 'Stock count' });
  assert.equal(ok.status, 204);
  assert.equal(stockOf(p.id).onHand, 9);
  const stale = await rpc(owner, 'owner_set_stock', { p_product_id: p.id, p_expected_on_hand: 4, p_new_on_hand: 1, p_track_inventory: true, p_low_stock_threshold: 2, p_reason: 'stale' });
  assert.ok(stale.status >= 400);
  assert.match(JSON.stringify(stale.body), /STALE/);
  const negative = await rpc(owner, 'owner_set_stock', { p_product_id: p.id, p_expected_on_hand: 9, p_new_on_hand: -1, p_track_inventory: true, p_low_stock_threshold: 2, p_reason: 'x' });
  assert.ok(negative.status >= 400);
  const noReason = await rpc(owner, 'owner_set_stock', { p_product_id: p.id, p_expected_on_hand: 9, p_new_on_hand: 8, p_track_inventory: true, p_low_stock_threshold: 2, p_reason: '' });
  assert.ok(noReason.status >= 400);
  await buy(p.slug, 3, { tag: 'reservedfloor' });
  const belowReserved = await rpc(owner, 'owner_set_stock', { p_product_id: p.id, p_expected_on_hand: 9, p_new_on_hand: 2, p_track_inventory: true, p_low_stock_threshold: 2, p_reason: 'x' });
  assert.ok(belowReserved.status >= 400);
  assert.match(JSON.stringify(belowReserved.body), /reserved/);
  const move = JSON.parse(sql(`select row_to_json(m) from public.inventory_movements m where product_id = '${p.id}' and kind = 'adjustment' order by id desc limit 1;`));
  assert.equal(move.actor_id, owner.id);
  assert.equal(move.actor_role, 'owner');
  assert.equal(move.on_hand_before, 4);
  assert.equal(move.on_hand_after, 9);
  assert.equal(move.reason, 'Stock count');
});

test('sales cannot change stock by any path; can read it; ledger is append-only', async () => {
  const p = product({ stock: 4 });
  const viaRpc = await rpc(sales, 'owner_set_stock', { p_product_id: p.id, p_expected_on_hand: 4, p_new_on_hand: 100, p_track_inventory: true, p_low_stock_threshold: 1, p_reason: 'x' });
  assert.ok(viaRpc.status >= 400);
  const direct = await rest(`product_inventory?product_id=eq.${p.id}`, { method: 'PATCH', body: { stock_on_hand: 100 }, ...asUser(sales), prefer: 'return=representation' });
  assert.ok(direct.status >= 400 || (Array.isArray(direct.body) && direct.body.length === 0));
  const ownerDirect = await rest(`product_inventory?product_id=eq.${p.id}`, { method: 'PATCH', body: { stock_on_hand: 100 }, ...asUser(owner), prefer: 'return=representation' });
  assert.ok(ownerDirect.status >= 400 || (Array.isArray(ownerDirect.body) && ownerDirect.body.length === 0), 'stock changes only through the audited function');
  assert.equal(stockOf(p.id).onHand, 4);
  const read = await rest(`product_inventory?product_id=eq.${p.id}`, asUser(sales));
  assert.equal(read.status, 200);
  assert.equal(read.body.length, 1);
  const tamper = await rest(`inventory_movements?product_id=eq.${p.id}`, { method: 'DELETE', ...asUser(owner), prefer: 'return=representation' });
  assert.ok(tamper.status >= 400 || (Array.isArray(tamper.body) && tamper.body.length === 0));
  for (const fn of ['commit_order_inventory', 'release_order_reservations', 'inventory_apply']) {
    const args = fn === 'inventory_apply'
      ? { p_product_id: p.id, p_delta_on_hand: 100, p_delta_reserved: 0, p_kind: 'adjustment', p_order_id: null, p_reason: 'x', p_idempotency_key: null }
      : { p_order_id: '00000000-0000-0000-0000-000000000000', ...(fn === 'commit_order_inventory' ? { p_source: 'card' } : { p_kind: 'release' }) };
    const r = await rpc(owner, fn, args);
    assert.ok(r.status >= 400, `${fn} must not be callable by staff`);
  }
});

test('quotations take stock only when fulfilment starts, and cannot oversell', async () => {
  const p = product({ stock: 1 });
  const quote = async (tag) => {
    const res = await fetch(`${APP_URL}/api/checkout/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-nf-client-connection-ip': freshIp() },
      body: JSON.stringify({ customer: { fullName: `TEST ${tag}`, email: `test.${tag}@example.com`, phone: '+968 9000 1234', address: 'TEST address, Ruwi, Muscat' }, items: [{ slug: p.slug, quantity: 1 }] }),
    });
    const body = await res.json();
    return sql(`select id from public.orders where order_number = '${body.data.orderNumber}';`);
  };
  const q1 = await quote('q1');
  const q2 = await quote('q2');
  assert.deepEqual(stockOf(p.id), { onHand: 1, reserved: 0, available: 1 }, 'quotations reserve nothing');
  for (const q of [q1, q2]) {
    await rpc(sales, 'staff_set_order_status', { p_order_id: q, p_expected_status: 'manual_inquiry', p_new_status: 'placement', p_reason: null });
    await rpc(owner, 'owner_set_offline_payment', { p_order_id: q, p_expected_payment_status: 'unpaid', p_new_payment_status: 'verified', p_reason: 'Bank transfer TEST' });
  }
  assert.equal((await rpc(sales, 'staff_set_order_status', { p_order_id: q1, p_expected_status: 'placement', p_new_status: 'processing', p_reason: null })).status, 200);
  assert.deepEqual(stockOf(p.id), { onHand: 0, reserved: 0, available: 0 });
  const second = await rpc(sales, 'staff_set_order_status', { p_order_id: q2, p_expected_status: 'placement', p_new_status: 'processing', p_reason: null });
  assert.ok(second.status >= 400);
  assert.match(JSON.stringify(second.body), /Not enough stock/);
  assert.equal(sql(`select status from public.orders where id = '${q2}';`), 'placement');
});

test('storefront availability is public but reveals no quantities', async () => {
  const none = product({ stock: 0 });
  const low = product({ stock: 2, threshold: 3 });
  const many = product({ stock: 50 });
  const r = await rest('rpc/get_product_availability', { method: 'POST', body: {}, token: stack.anonKey, apikey: stack.anonKey });
  assert.equal(r.status, 200);
  const bySlug = Object.fromEntries(r.body.map((x) => [x.slug, x]));
  assert.equal(bySlug[none.slug].availability, 'out_of_stock');
  assert.equal(bySlug[low.slug].availability, 'low_stock');
  assert.equal(bySlug[many.slug].availability, 'in_stock');
  assert.deepEqual(Object.keys(bySlug[many.slug]).sort(), ['availability', 'product_id', 'slug']);
  const direct = await rest('product_inventory?select=*', { token: stack.anonKey, apikey: stack.anonKey });
  assert.ok(direct.status >= 400 || (Array.isArray(direct.body) && direct.body.length === 0), 'raw stock is not public');
});

test('checkout requires the delivery acknowledgement; a repeated checkout key cannot create a second order', async () => {
  const p = product({ stock: 10 });
  const noAck = await buy(p.slug, 1, { tag: 'noack', acknowledge: false });
  assert.equal(noAck.status, 400);
  const key = `test-key-${Date.now()}-abcdef`;
  const [first, second] = await Promise.all([
    buy(p.slug, 1, { tag: 'dupkey', extraHeaders: { 'Idempotency-Key': key } }),
    buy(p.slug, 1, { tag: 'dupkey', extraHeaders: { 'Idempotency-Key': key } }),
  ]);
  assert.deepEqual([first.status, second.status].sort(), [200, 409]);
  assert.equal(sql(`select count(*) from public.orders where checkout_key = '${key}';`), '1');
  assert.equal(stockOf(p.id).reserved, 1, 'only one reservation for the duplicated submit');
});

test('REVIEW H1: a shortfall is recoverable - owner restocks and retries (sales cannot)', async () => {
  const p = product({ stock: 1 });
  const a = await buy(p.slug, 1, { tag: 'h1a' });
  sql(`update public.inventory_reservations set expires_at = now() - interval '1 minute' where product_id = '${p.id}';`);
  await runRecovery();
  await buy(p.slug, 1, { tag: 'h1b' });
  await paid(a.body.data.orderNumber, 10000);
  const aId = sql(`select id from public.orders where order_number = '${a.body.data.orderNumber}';`);
  assert.equal(sql(`select inventory_state from public.orders where id = '${aId}';`), 'shortfall');
  const early = await rpc(owner, 'owner_retry_stock_commit', { p_order_id: aId, p_reason: 'try' });
  assert.ok(early.status >= 400, 'still no stock: retry refused, state unchanged');
  assert.equal(sql(`select inventory_state from public.orders where id = '${aId}';`), 'shortfall');
  await rpc(owner, 'owner_set_stock', { p_product_id: p.id, p_expected_on_hand: 1, p_new_on_hand: 3, p_track_inventory: true, p_low_stock_threshold: 1, p_reason: 'Restocked' });
  assert.ok((await rpc(sales, 'owner_retry_stock_commit', { p_order_id: aId, p_reason: 'x' })).status >= 400, 'sales cannot retry');
  assert.equal((await rpc(owner, 'owner_retry_stock_commit', { p_order_id: aId, p_reason: 'Restocked 3 units' })).status, 200);
  assert.equal(sql(`select inventory_state from public.orders where id = '${aId}';`), 'committed');
  assert.deepEqual(stockOf(p.id), { onHand: 2, reserved: 1, available: 1 });
  assert.equal((await rpc(sales, 'staff_set_order_status', { p_order_id: aId, p_expected_status: 'paid', p_new_status: 'processing', p_reason: null })).status, 200, 'now fulfillable');
});

test('REVIEW H2: card orders are capped at 50 units and 3 open checkouts per client', async () => {
  const p = product({ stock: 500 });
  const big = await buy(p.slug, 51, { tag: 'h2big' });
  assert.equal(big.status, 409);
  assert.equal(big.body.error.code, 'CARD_QUANTITY_LIMIT');
  const ip = freshIp();
  const statuses = [];
  for (let i = 0; i < 4; i++) statuses.push((await buy(p.slug, 1, { ip, tag: `h2open${i}` })).status);
  assert.deepEqual(statuses, [200, 200, 200, 429]);
  assert.equal(stockOf(p.id).reserved, 3);
});

test('REVIEW M3: tracking cannot be switched off while units are reserved', async () => {
  const p = product({ stock: 5 });
  await buy(p.slug, 1, { tag: 'm3' });
  const off = await rpc(owner, 'owner_set_stock', { p_product_id: p.id, p_expected_on_hand: 5, p_new_on_hand: 5, p_track_inventory: false, p_low_stock_threshold: 3, p_reason: 'made to order' });
  assert.ok(off.status >= 400);
  assert.match(JSON.stringify(off.body), /reserved/);
});

test('REVIEW L2: a missing expected value can never bypass the stale-write check', async () => {
  const p = product({ stock: 5 });
  const r = await rpc(owner, 'owner_set_stock', { p_product_id: p.id, p_expected_on_hand: null, p_new_on_hand: 0, p_track_inventory: true, p_low_stock_threshold: 3, p_reason: 'x' });
  assert.ok(r.status >= 400);
  assert.equal(stockOf(p.id).onHand, 5);
});
