import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APP_URL, assertIsolated, checkout, customer, freshIp, paymentFor, rest, sql, stack } from './harness.mjs';

assertIsolated();

const cookieFrom = (setCookie) => setCookie.split(';')[0];

test('order lookup by number + email + phone is retired and reveals nothing', async () => {
  const r = await checkout([{ slug: 'gfo-baby-fire-ball-400-gms', quantity: 1 }], { tag: 'lookup' });
  const orderNumber = r.body.data.orderNumber;
  const res = await fetch(`${APP_URL}/api/orders/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber, contact: 'test.lookup@example.com' }),
  });
  assert.equal(res.status, 410);
  const text = await res.text();
  assert.ok(!text.includes('test.lookup') && !text.includes('Ruwi') && !text.includes(orderNumber));
  const svc = await rest('rpc/track_order', { method: 'POST', body: { p_order_number: orderNumber, p_contact: 'test.lookup@example.com' } });
  assert.ok(svc.status >= 400, 'the lookup function is no longer executable');
});

test('checkout sets an HttpOnly, expiring, order-scoped cookie and never returns the token', async () => {
  const r = await checkout([{ slug: 'gfo-baby-fire-ball-400-gms', quantity: 1 }], { tag: 'cookie' });
  const [p] = await paymentFor(r.body.data.orderNumber);
  assert.ok(!JSON.stringify(r.body).includes(p.orders.public_token), 'token not in JSON body');
  assert.match(r.setCookie, /^sams_order_access=[a-f0-9]{48};/);
  assert.match(r.setCookie, /HttpOnly/i);
  assert.match(r.setCookie, /SameSite=lax/i);
  assert.match(r.setCookie, /Max-Age=86400/);
  assert.match(r.setCookie, /Path=\//);
});

test('status needs the order cookie: none, forged or foreign -> 404; own -> status only (no PII)', async () => {
  const mine = await checkout([{ slug: 'gfo-baby-fire-ball-400-gms', quantity: 1 }], { tag: 'mine' });
  const status = (cookie, query = '') => fetch(`${APP_URL}/api/orders/status${query}`, { method: 'POST', headers: cookie ? { cookie } : {} });

  assert.equal((await status(null)).status, 404);
  assert.equal((await status(`sams_order_access=${'0'.repeat(48)}`)).status, 404);
  const [p] = await paymentFor(mine.body.data.orderNumber);
  assert.equal((await status(null, `?token=${p.orders.public_token}`)).status, 404, 'query-string tokens are ignored');

  const own = await status(cookieFrom(mine.setCookie));
  assert.equal(own.status, 200);
  const body = await own.json();
  assert.deepEqual(Object.keys(body.data).sort(), ['created_at', 'currency', 'order_number', 'payment_status', 'status', 'total_amount']);
});

test('order-access tokens expire server-side after 7 days', async () => {
  const r = await checkout([{ slug: 'gfo-baby-fire-ball-400-gms', quantity: 1 }], { tag: 'old' });
  sql(`update public.orders set created_at = now() - interval '8 days' where order_number = '${r.body.data.orderNumber}';`);
  const res = await fetch(`${APP_URL}/api/orders/status`, { method: 'POST', headers: { cookie: cookieFrom(r.setCookie) } });
  assert.equal(res.status, 404);
});

test('anonymous visitors see the six approved products and nothing private', async () => {
  const products = await rest('products?select=slug,price&order=slug', { token: stack.anonKey, apikey: stack.anonKey });
  assert.deepEqual(products.body.map((p) => [p.slug, Number(p.price)]), [
    ['afo-fire-ball-extinguisher-1-5-kg', 23.4],
    ['gfo-baby-fire-ball-400-gms', 12],
    ['gfo-fire-ball-extinguisher-1-3-kg', 15],
    ['gfo-fire-drum-5-kg', 52],
    ['gfo-flowerpot-extinguisher-1-3-kg', 23.4],
    ['gfo-green-fire-ball-1-3-kg', 21.45],
  ]);
  for (const table of ['orders', 'inquiries', 'payments', 'order_status_history', 'paymob_callbacks', 'staff_profiles', 'product_costs']) {
    const r = await rest(`${table}?select=*&limit=1`, { token: stack.anonKey, apikey: stack.anonKey });
    assert.ok(r.status >= 400 || (Array.isArray(r.body) && r.body.length === 0), `${table} must be private`);
  }
});

test('quotation is priced on the server; enquiries are saved; inputs are validated', async () => {
  const q = await fetch(`${APP_URL}/api/checkout/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-nf-client-connection-ip': freshIp() },
    body: JSON.stringify({ customer: customer('price'), items: [{ slug: 'afo-fire-ball-extinguisher-1-5-kg', quantity: 2, price: 0.001 }] }),
  });
  assert.equal(q.status, 201);
  assert.equal((await q.json()).data.totalAmount, 46.8);

  const inq = await fetch(`${APP_URL}/api/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-nf-client-connection-ip': freshIp() },
    body: JSON.stringify({ fullName: 'TEST Enquirer', email: 'test.enq@example.com', phone: '+968 9111 2222', quantity: 3, message: 'Please quote 3 drums', productSlug: 'gfo-fire-drum-5-kg' }),
  });
  assert.equal(inq.status, 201);
  assert.equal(sql(`select count(*) from public.inquiries where email = 'test.enq@example.com';`) !== '0', true);

  const bad = await fetch(`${APP_URL}/api/checkout/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-nf-client-connection-ip': freshIp() },
    body: JSON.stringify({ customer: { ...customer('x'), fullName: '<script>' }, items: [{ slug: 'gfo-fire-drum-5-kg', quantity: 0 }] }),
  });
  assert.equal(bad.status, 400);
});

test('storefront pages render', async () => {
  for (const path of ['/', '/catalog', '/catalog/gfo-fire-drum-5-kg', '/checkout', '/checkout/result', '/orders', '/contact', '/admin']) {
    const res = await fetch(`${APP_URL}${path}`);
    assert.equal(res.status, 200, path);
  }
  const simulator = await fetch(`${APP_URL}/paymob-simulate`);
  assert.equal(simulator.status, 404);
});
