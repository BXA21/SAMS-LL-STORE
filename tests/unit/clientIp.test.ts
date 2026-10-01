import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clientIdentity, normalizeIp, rateLimitKey, trustedClientIpHeader } from '../../src/lib/clientIp.ts';

const NETLIFY = { NETLIFY: 'true', NODE_ENV: 'production' } as unknown as NodeJS.ProcessEnv;
const VERCEL = { VERCEL: '1', NODE_ENV: 'production' } as unknown as NodeJS.ProcessEnv;
const PROD_UNCONFIGURED = { NODE_ENV: 'production' } as unknown as NodeJS.ProcessEnv;
const headers = (h: Record<string, string>) => new Headers(h);

test('trusted header selection', () => {
  assert.equal(trustedClientIpHeader(NETLIFY), 'x-nf-client-connection-ip');
  assert.equal(trustedClientIpHeader(VERCEL), 'x-vercel-forwarded-for');
  assert.equal(trustedClientIpHeader({ CLIENT_IP_HEADER: 'X-NF-Client-Connection-IP' } as unknown as NodeJS.ProcessEnv), 'x-nf-client-connection-ip');
  assert.equal(trustedClientIpHeader({ CLIENT_IP_HEADER: 'bad header!' } as unknown as NodeJS.ProcessEnv), null);
  assert.equal(trustedClientIpHeader(PROD_UNCONFIGURED), null);
});

test('IPv4 / IPv6 normalisation and rejection', () => {
  assert.equal(normalizeIp('203.0.113.9'), '203.0.113.9');
  assert.equal(normalizeIp(' 203.0.113.9 '), '203.0.113.9');
  assert.equal(normalizeIp('::ffff:203.0.113.9'), '203.0.113.9');
  assert.equal(normalizeIp('2001:db8:abcd:12::1'), '2001:0db8:abcd:0012::/64');
  assert.equal(normalizeIp('[2001:DB8:ABCD:12::ff]'), '2001:0db8:abcd:0012::/64');
  assert.equal(normalizeIp('2001:db8:abcd:12:1:2:3:4'), '2001:0db8:abcd:0012::/64');
  for (const bad of [null, '', ' ', 'abc', '999.1.1.1', '1.2.3.4, 5.6.7.8', '1.2.3.4:80', 'fe80::1%eth0', '1.2.3', 'x'.repeat(5000), '2001:db8::1::2']) {
    assert.equal(normalizeIp(bad), null, String(bad).slice(0, 30));
  }
});

test('only the trusted header counts; spoofable headers are ignored', () => {
  const id = clientIdentity(headers({ 'x-nf-client-connection-ip': '203.0.113.9', 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '2.2.2.2' }), NETLIFY);
  assert.deepEqual(id, { source: 'trusted-header', value: '203.0.113.9' });
  const spoofOnly = clientIdentity(headers({ 'x-forwarded-for': '1.1.1.1' }), NETLIFY);
  assert.deepEqual(spoofOnly, { source: 'unattributed', value: 'unattributed' });
});

test('on Vercel only x-vercel-forwarded-for counts', () => {
  const id = clientIdentity(headers({ 'x-vercel-forwarded-for': '203.0.113.7', 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '2.2.2.2' }), VERCEL);
  assert.deepEqual(id, { source: 'trusted-header', value: '203.0.113.7' });
  const spoofOnly = clientIdentity(headers({ 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '2.2.2.2' }), VERCEL);
  assert.deepEqual(spoofOnly, { source: 'unattributed', value: 'unattributed' });
});

test('missing trusted context in production never yields a caller-chosen identity', () => {
  const a = clientIdentity(headers({ 'x-forwarded-for': '1.1.1.1' }), PROD_UNCONFIGURED);
  const b = clientIdentity(headers({ 'x-forwarded-for': '9.9.9.9' }), PROD_UNCONFIGURED);
  assert.deepEqual(a, b);
  assert.equal(a.source, 'unattributed');
});

test('keys are fixed-length and never contain the raw address', () => {
  const k = rateLimitKey('checkout', { source: 'trusted-header', value: '203.0.113.9' });
  assert.ok(k.length <= 128);
  assert.ok(!k.includes('203.0.113.9'));
  assert.equal(k, rateLimitKey('checkout', { source: 'trusted-header', value: '203.0.113.9' }));
  assert.notEqual(k, rateLimitKey('quote', { source: 'trusted-header', value: '203.0.113.9' }));
});
