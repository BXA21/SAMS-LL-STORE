import assert from 'node:assert/strict';
import { test } from 'node:test';
import { APP_URL, assertIsolated, checkout, customer, sql } from './harness.mjs';

assertIsolated();

const quote = (headers, tag = 'rl') =>
  fetch(`${APP_URL}/api/checkout/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ customer: customer(tag), items: [{ slug: 'gfo-baby-fire-ball-400-gms', quantity: 1 }] }),
  });

const QUOTE_LIMIT = 6;

test('spoofed X-Forwarded-For / X-Real-IP cannot mint new identities', async () => {
  const ip = '198.51.100.21';
  const statuses = [];
  for (let i = 0; i < QUOTE_LIMIT + 2; i++) {
    const r = await quote({ 'x-nf-client-connection-ip': ip, 'x-forwarded-for': `10.0.0.${i}`, 'x-real-ip': `10.1.0.${i}` });
    statuses.push(r.status);
  }
  assert.deepEqual(statuses.slice(0, QUOTE_LIMIT), Array(QUOTE_LIMIT).fill(201));
  assert.deepEqual(statuses.slice(QUOTE_LIMIT), [429, 429]);
});

test('429 is controlled and carries Retry-After', async () => {
  const ip = '198.51.100.22';
  let last;
  for (let i = 0; i <= QUOTE_LIMIT; i++) last = await quote({ 'x-nf-client-connection-ip': ip });
  assert.equal(last.status, 429);
  assert.ok(Number(last.headers.get('retry-after')) > 0);
  const body = await last.json();
  assert.equal(body.error.code, 'RATE_LIMITED');
});

test('the trusted header is what separates clients', async () => {
  const a = await quote({ 'x-nf-client-connection-ip': '198.51.100.31' });
  const b = await quote({ 'x-nf-client-connection-ip': '198.51.100.32' });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
});

test('oversized, malformed and list-valued IPs share one unattributed bucket (never 500)', async () => {
  sql(`delete from public.rate_limits;`);
  const bad = ['x'.repeat(5000), 'not-an-ip', '1.2.3.4, 5.6.7.8', '1.2.3.4:80', '999.1.1.1', 'fe80::1%eth0', ''];
  const statuses = [];
  for (let i = 0; i < QUOTE_LIMIT + 2; i++) {
    const r = await quote({ 'x-nf-client-connection-ip': bad[i % bad.length] });
    statuses.push(r.status);
  }
  assert.ok(statuses.every((s) => s === 201 || s === 429), `unexpected statuses ${statuses}`);
  assert.equal(statuses.filter((s) => s === 201).length, QUOTE_LIMIT, 'all malformed values must share one bucket');
  const keyLengths = sql(`select max(char_length(key)) from public.rate_limits;`);
  assert.ok(Number(keyLengths) <= 128, 'stored keys are bounded');
});

test('IPv6 addresses in the same /64 share a bucket; IPv4-mapped IPv6 equals IPv4', async () => {
  sql(`delete from public.rate_limits;`);
  const statuses = [];
  for (let i = 0; i < QUOTE_LIMIT + 1; i++) {
    const r = await quote({ 'x-nf-client-connection-ip': `2001:db8:abcd:12::${(i + 1).toString(16)}` });
    statuses.push(r.status);
  }
  assert.equal(statuses.at(-1), 429);
  sql(`delete from public.rate_limits;`);
  for (let i = 0; i < QUOTE_LIMIT; i++) await quote({ 'x-nf-client-connection-ip': '198.51.100.40' });
  const mapped = await quote({ 'x-nf-client-connection-ip': '::ffff:198.51.100.40' });
  assert.equal(mapped.status, 429);
});

test('concurrent burst from one client admits exactly the limit (shared DB store)', async () => {
  sql(`delete from public.rate_limits;`);
  const results = await Promise.all(Array.from({ length: 20 }, () => quote({ 'x-nf-client-connection-ip': '198.51.100.50' })));
  const ok = results.filter((r) => r.status === 201).length;
  const limited = results.filter((r) => r.status === 429).length;
  assert.equal(ok, QUOTE_LIMIT);
  assert.equal(limited, 20 - QUOTE_LIMIT);
});

test('limiter store failure -> retryable 503 and NO order or payment is created', async () => {
  const before = sql(`select count(*) from public.orders; `) + '/' + sql(`select count(*) from public.payments;`);
  sql(`alter function public.check_rate_limit(text, integer, integer) rename to check_rate_limit_disabled;`);
  try {
    const r = await checkout([{ slug: 'gfo-baby-fire-ball-400-gms', quantity: 1 }], { ip: '198.51.100.60' });
    assert.equal(r.status, 503);
    assert.equal(r.body.error.code, 'SERVICE_UNAVAILABLE');
  } finally {
    sql(`alter function public.check_rate_limit_disabled(text, integer, integer) rename to check_rate_limit;`);
  }
  const after = sql(`select count(*) from public.orders; `) + '/' + sql(`select count(*) from public.payments;`);
  assert.equal(after, before);
});
