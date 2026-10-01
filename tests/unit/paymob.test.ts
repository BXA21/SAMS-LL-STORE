import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { normalizeCallback, verifyCallbackHmac, verifyRedirectHmac } from '../../src/lib/paymob.ts';

const SECRET = 'unit-test-secret';
const FIELDS = ['amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id', 'integration_id',
  'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending',
  'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success'];

const obj = {
  id: 3221770, amount_cents: 24000, created_at: '2026-09-28T13:44:40.123456', currency: 'OMR', error_occured: false,
  has_parent_transaction: false, integration_id: 69632, is_3d_secure: true, is_auth: false, is_capture: false, is_refunded: false,
  is_standalone_payment: true, is_voided: false, order: { id: 4166321, merchant_order_id: 'SAMS-10012-8df93a' }, owner: 1,
  pending: false, success: true, source_data: { pan: '2346', sub_type: 'MasterCard', type: 'card' },
};

// Independent reference implementation of Paymob's documented concatenation.
function reference(o: Record<string, unknown>): string {
  const read = (p: string) => p.split('.').reduce<unknown>((a, k) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[k] : undefined), o);
  const msg = FIELDS.map((f) => { const v = read(f); return v === undefined || v === null ? '' : String(v); }).join('');
  return crypto.createHmac('sha512', SECRET).update(msg).digest('hex');
}

test('callback HMAC: valid, uppercase, and every tampered signed field', () => {
  const good = reference(obj);
  assert.equal(verifyCallbackHmac(SECRET, obj, good), true);
  assert.equal(verifyCallbackHmac(SECRET, obj, good.toUpperCase()), true);
  assert.equal(verifyCallbackHmac(SECRET, obj, null), false);
  assert.equal(verifyCallbackHmac(SECRET, obj, 'short'), false, 'length mismatch must not throw');
  assert.equal(verifyCallbackHmac('wrong-secret', obj, good), false);
  for (const [path, value] of [['amount_cents', 1], ['success', false], ['pending', true], ['integration_id', 1], ['id', 1], ['currency', 'EGP'], ['is_refunded', true]] as const) {
    const t = structuredClone(obj) as Record<string, unknown>;
    t[path] = value;
    assert.equal(verifyCallbackHmac(SECRET, t, good), false, `tampered ${path}`);
  }
  const orderTampered = structuredClone(obj);
  orderTampered.order.id = 1;
  assert.equal(verifyCallbackHmac(SECRET, orderTampered, good), false, 'tampered order.id');
  const refTampered = structuredClone(obj);
  refTampered.order.merchant_order_id = 'SAMS-OTHER';
  assert.equal(verifyCallbackHmac(SECRET, refTampered, good), true, 'merchant_order_id is NOT signed - it must never select the order');
});

test('redirect HMAC accepts Paymob `order` or documented `order_id`', () => {
  const good = reference(obj);
  const params = new URLSearchParams();
  for (const f of FIELDS) {
    const v = f.split('.').reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], obj);
    params.set(f === 'order.id' ? 'order' : f, String(v));
  }
  params.set('hmac', good);
  assert.equal(verifyRedirectHmac(SECRET, params), true);
  params.set('amount_cents', '1');
  assert.equal(verifyRedirectHmac(SECRET, params), false);
});

test('normalizeCallback: exact integer minor units and strict ids', () => {
  const n = normalizeCallback(obj)!;
  assert.equal(n.amountMinor, 24000);
  assert.equal(n.providerOrderId, '4166321');
  assert.equal(n.merchantReference, 'SAMS-10012-8df93a');
  assert.equal(n.integrationId, 69632);
  assert.equal(normalizeCallback({ ...obj, amount_cents: 24000.5 })!.amountMinor, null);
  assert.equal(normalizeCallback({ ...obj, amount_cents: '2.4e4' })!.amountMinor, null);
  assert.equal(normalizeCallback({ ...obj, amount_cents: '24000' })!.amountMinor, 24000);
  assert.equal(normalizeCallback({ ...obj, id: 'abc' }), null);
  assert.equal(normalizeCallback({ ...obj, order: { id: '12;drop', merchant_order_id: 'x' } })!.providerOrderId, null);
});

test('Paymob keys must match the deployment environment', async () => {
  const { paymobModeProblem } = await import('../../src/lib/serverEnv.ts');
  assert.equal(paymobModeProblem('omn_sk_live_a', 'omn_pk_live_b', 'production'), null);
  assert.equal(paymobModeProblem('omn_sk_test_a', 'omn_pk_test_b', 'preview'), null);
  assert.equal(paymobModeProblem('omn_sk_test_a', 'omn_pk_test_b', undefined), null);
  assert.match(paymobModeProblem('omn_sk_test_a', 'omn_pk_test_b', 'production') ?? '', /production/);
  assert.match(paymobModeProblem('omn_sk_live_a', 'omn_pk_live_b', 'preview') ?? '', /preview/);
  assert.match(paymobModeProblem('omn_sk_live_a', 'omn_pk_test_b', 'production') ?? '', /different modes/);
  assert.equal(paymobModeProblem('sk_unrecognised', 'pk_unrecognised', 'production'), null);
});

test('deployment environment is read from Netlify and Vercel variables', async () => {
  const { deploymentEnvironment } = await import('../../src/lib/serverEnv.ts');
  const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;
  assert.equal(deploymentEnvironment(env({ CONTEXT: 'production' })), 'production');
  assert.equal(deploymentEnvironment(env({ CONTEXT: 'deploy-preview' })), 'preview');
  assert.equal(deploymentEnvironment(env({ CONTEXT: 'branch-deploy' })), 'preview');
  assert.equal(deploymentEnvironment(env({ VERCEL_ENV: 'preview' })), 'preview');
  assert.equal(deploymentEnvironment(env({ CONTEXT: 'production', SAMS_DEPLOY_ENV: 'preview' })), 'preview');
  assert.equal(deploymentEnvironment(env({})), undefined);
});
