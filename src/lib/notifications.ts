import 'server-only';

/*
 * Email delivery for the notification outbox.
 *
 * NOTIFICATION_PROVIDER:
 *   disabled (default) - nothing is sent; outbox rows stay pending, so no real
 *                        customer can receive a message by accident.
 *   mock               - POSTs to MOCK_EMAIL_URL (local tests only).
 * A real provider (SMTP / transactional email service) is an owner decision
 * and is not wired in yet.
 *
 * Staff recipients are never stored in the database: the outbox holds the
 * literal 'staff', resolved here from ORDER_NOTIFICATION_EMAIL.
 */

export interface OutboxRow {
  id: string;
  order_id: string | null;
  event_type: 'order_paid_customer' | 'order_paid_staff' | 'refund_recorded_staff' | 'payment_alert_staff';
  recipient: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<{ id: string }>;
}

const EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[^\s@<>]{2,24}$/;

export function getEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProvider | null {
  const provider = (env.NOTIFICATION_PROVIDER || 'disabled').toLowerCase();
  if (provider === 'mock') {
    const url = env.MOCK_EMAIL_URL;
    if (!url || !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)) return null; // mock must be local
    return {
      name: 'mock',
      async send(message) {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': message.idempotencyKey },
          body: JSON.stringify(message),
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`mock email HTTP ${res.status}`);
        const body = (await res.json().catch(() => ({}))) as { id?: string };
        return { id: String(body.id ?? 'mock') };
      },
    };
  }
  return null;
}

function resolveRecipient(row: OutboxRow, env: NodeJS.ProcessEnv): string | null {
  const to = row.recipient === 'staff' ? env.ORDER_NOTIFICATION_EMAIL?.trim() : row.recipient;
  return to && EMAIL.test(to) ? to : null;
}

function omr(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(3)} OMR` : '';
}

function itemLines(items: unknown): string {
  if (!Array.isArray(items)) return '';
  return items
    .map((i) => {
      const it = i as Record<string, unknown>;
      return `- ${Number(it.quantity)} x ${String(it.product_name ?? '').slice(0, 120)} (${omr(it.total_price)})`;
    })
    .join('\n');
}

export function renderEmail(row: OutboxRow, env: NodeJS.ProcessEnv = process.env): Omit<EmailMessage, 'to' | 'idempotencyKey'> {
  const p = row.payload;
  const order = String(p.order_number ?? '');
  const support = env.SUPPORT_EMAIL ? `\nQuestions: ${env.SUPPORT_EMAIL}` : '';
  switch (row.event_type) {
    case 'order_paid_customer':
      return {
        subject: `SAMS order ${order}: payment received`,
        text:
          `Hello ${String(p.customer_name ?? '').slice(0, 120)},\n\n` +
          `We received your card payment for order ${order}.\n\n${itemLines(p.items)}\nProducts total: ${omr(p.total_amount)}\n\n` +
          `Your card payment covers the products only. Our team will contact you on WhatsApp to arrange delivery, ` +
          `including any delivery charge, before dispatch.${support}\n\nSAMS LLC`,
      };
    case 'order_paid_staff':
      return {
        subject: `New paid order ${order} (${omr(p.total_amount)})`,
        text: `A card payment was confirmed by Paymob for order ${order}.\n\n${itemLines(p.items)}\n\nOpen the SAMS dashboard to arrange delivery.`,
      };
    case 'refund_recorded_staff':
      return {
        subject: `Refund recorded on ${order}`,
        text: `Paymob confirmed a ${String(p.kind)} of ${omr(Number(p.refunded_minor) / 1000)} on order ${order} (total refunded ${omr(Number(p.cumulative_minor) / 1000)}).\nStock is NOT returned automatically; use "Return items to stock" if goods came back.`,
      };
    default:
      return { subject: `SAMS notification ${order}`, text: 'See the SAMS dashboard.' };
  }
}

export type DeliveryResult = { status: 'sent'; providerId: string } | { status: 'retry'; error: string };

export async function deliver(row: OutboxRow, provider: EmailProvider, env: NodeJS.ProcessEnv = process.env): Promise<DeliveryResult> {
  const to = resolveRecipient(row, env);
  if (!to) return { status: 'retry', error: row.recipient === 'staff' ? 'ORDER_NOTIFICATION_EMAIL not configured' : 'invalid recipient address' };
  try {
    const sent = await provider.send({ to, ...renderEmail(row, env), idempotencyKey: row.idempotency_key });
    return { status: 'sent', providerId: sent.id };
  } catch (err) {
    return { status: 'retry', error: err instanceof Error ? err.message.slice(0, 200) : 'send failed' };
  }
}
