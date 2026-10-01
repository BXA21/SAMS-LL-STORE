import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deliver, getEmailProvider, renderEmail, type EmailProvider, type OutboxRow } from '../../src/lib/notifications.ts';
import { getInquiryConfig, normalizeInquiry } from '../../src/lib/paymobInquiry.ts';

const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;

const row = (over: Partial<OutboxRow> = {}): OutboxRow => ({
  id: 'n1', order_id: 'o1', event_type: 'order_paid_customer', recipient: 'buyer@example.com',
  idempotency_key: 'order_paid_customer:o1',
  payload: { order_number: 'SAMS-10001', customer_name: 'Buyer', total_amount: 24, items: [{ quantity: 2, product_name: 'Ball', total_price: 24 }] },
  ...over,
});

test('email is disabled unless explicitly configured; mock must be local', () => {
  assert.equal(getEmailProvider(env({})), null);
  assert.equal(getEmailProvider(env({ NOTIFICATION_PROVIDER: 'disabled' })), null);
  assert.equal(getEmailProvider(env({ NOTIFICATION_PROVIDER: 'mock', MOCK_EMAIL_URL: 'https://evil.example/hook' })), null);
  assert.ok(getEmailProvider(env({ NOTIFICATION_PROVIDER: 'mock', MOCK_EMAIL_URL: 'http://127.0.0.1:9/__email' })));
});

test('customer confirmation states products-only payment and separate delivery', () => {
  const mail = renderEmail(row(), env({}));
  assert.match(mail.subject, /SAMS-10001/);
  assert.match(mail.text, /products only/);
  assert.match(mail.text, /WhatsApp/);
  assert.match(mail.text, /24\.000 OMR/);
  assert.doesNotMatch(mail.text, /free delivery/i);
});

test('staff recipient resolves only from ORDER_NOTIFICATION_EMAIL', async () => {
  const sent: string[] = [];
  const provider: EmailProvider = { name: 't', send: async (m) => { sent.push(m.to); return { id: 'x' }; } };
  const staffRow = row({ event_type: 'order_paid_staff', recipient: 'staff' });
  assert.deepEqual(await deliver(staffRow, provider, env({})), { status: 'retry', error: 'ORDER_NOTIFICATION_EMAIL not configured' });
  assert.deepEqual(await deliver(staffRow, provider, env({ ORDER_NOTIFICATION_EMAIL: 'ops@example.com' })), { status: 'sent', providerId: 'x' });
  assert.deepEqual(sent, ['ops@example.com']);
  assert.equal((await deliver(row({ recipient: 'not-an-email' }), provider, env({}))).status, 'retry');
});

test('provider failure becomes a retry, never a thrown error', async () => {
  const provider: EmailProvider = { name: 't', send: async () => { throw new Error('SMTP down'); } };
  assert.deepEqual(await deliver(row(), provider, env({})), { status: 'retry', error: 'SMTP down' });
});

test('Paymob inquiry normalisation uses documented fields and rejects garbage', () => {
  const tx = normalizeInquiry({
    id: 123, amount_cents: 5000, currency: 'OMR', success: true, pending: false, is_refund: true, is_refunded: false,
    refunded_amount_cents: 0, is_void: false, is_voided: false, parent_transaction: 99, has_parent_transaction: true,
  })!;
  assert.equal(tx.id, '123');
  assert.equal(tx.parent_transaction, '99');
  assert.equal(tx.is_refund, true);
  assert.equal(normalizeInquiry({ id: 'x' }), null);
  assert.equal(normalizeInquiry(null), null);
  assert.equal(normalizeInquiry({ id: 1, amount_cents: 1.5 })!.amount_cents, 0);
  assert.equal(normalizeInquiry({ id: 1, parent_transaction: { id: 77 } })!.parent_transaction, '77');
});

test('refund verification is off until a real API key is configured', () => {
  assert.equal(getInquiryConfig(env({})), null);
  assert.equal(getInquiryConfig(env({ PAYMOB_API_KEY: 'your-paymob-api-key' })), null);
  assert.equal(getInquiryConfig(env({ PAYMOB_API_KEY: 'k', PAYMOB_INQUIRY_PATH: '/no-placeholder' })), null);
  assert.equal(getInquiryConfig(env({ PAYMOB_API_KEY: 'k' }))!.inquiryPath, '/api/acceptance/transactions/{id}');
});
