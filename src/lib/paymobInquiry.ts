import 'server-only';

/*
 * Paymob Transaction Inquiry: our server asks Paymob, with our own
 * credentials over TLS, for its authoritative view of a transaction. Used to
 * verify refunds/voids, whose amount and parent id are not covered by the
 * callback HMAC.
 *
 * Documented response fields used: id, amount_cents, currency, success,
 * pending, is_refund, is_refunded, refunded_amount_cents, is_void, is_voided,
 * parent_transaction, has_parent_transaction, order.
 * Auth per Paymob docs: a Bearer auth token from the Authentication Request
 * (API key). Base path and auth endpoint are configurable because the exact
 * Oman paths must be confirmed on staging.
 */

export interface InquiryConfig {
  baseUrl: string;
  apiKey: string;
  authPath: string;
  inquiryPath: string; // must contain {id}
}

export interface InquiredTransaction {
  id: string;
  amount_cents: number;
  currency: string;
  success: boolean;
  pending: boolean;
  is_refund: boolean;
  is_refunded: boolean;
  refunded_amount_cents: number;
  is_void: boolean;
  is_voided: boolean;
  parent_transaction: string | null;
  has_parent_transaction: boolean;
  /** Paymob order id, from the documented `order` object. */
  order_id: string | null;
}

export function getInquiryConfig(env: NodeJS.ProcessEnv = process.env): InquiryConfig | null {
  const apiKey = env.PAYMOB_API_KEY?.trim();
  if (!apiKey || /placeholder|your-/i.test(apiKey)) return null;
  const baseUrl = (env.PAYMOB_BASE_URL || 'https://oman.paymob.com').replace(/\/api\/?$/, '').replace(/\/+$/, '');
  const inquiryPath = env.PAYMOB_INQUIRY_PATH || '/api/acceptance/transactions/{id}';
  if (!inquiryPath.includes('{id}')) return null;
  return { baseUrl, apiKey, authPath: env.PAYMOB_AUTH_PATH || '/api/auth/tokens', inquiryPath };
}

const toBool = (v: unknown) => v === true || v === 'true';
const toInt = (v: unknown): number => {
  const n = typeof v === 'string' && /^[0-9]{1,15}$/.test(v) ? Number(v) : v;
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : 0;
};
const toId = (v: unknown): string | null => {
  const s = v === null || v === undefined ? '' : String(v);
  return /^[0-9]{1,32}$/.test(s) ? s : null;
};

/** Normalises Paymob's response; refuses anything without a numeric id. */
export function normalizeInquiry(raw: unknown): InquiredTransaction | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = toId(r.id);
  if (!id) return null;
  const parent = r.parent_transaction && typeof r.parent_transaction === 'object'
    ? toId((r.parent_transaction as Record<string, unknown>).id)
    : toId(r.parent_transaction);
  return {
    id,
    amount_cents: toInt(r.amount_cents),
    currency: typeof r.currency === 'string' ? r.currency.slice(0, 8) : '',
    success: toBool(r.success),
    pending: toBool(r.pending),
    is_refund: toBool(r.is_refund),
    is_refunded: toBool(r.is_refunded),
    refunded_amount_cents: toInt(r.refunded_amount_cents),
    is_void: toBool(r.is_void),
    is_voided: toBool(r.is_voided),
    parent_transaction: parent,
    has_parent_transaction: toBool(r.has_parent_transaction),
    order_id: r.order && typeof r.order === 'object' ? toId((r.order as Record<string, unknown>).id) : toId(r.order),
  };
}

export async function fetchTransaction(config: InquiryConfig, transactionId: string): Promise<InquiredTransaction> {
  if (!/^[0-9]{1,32}$/.test(transactionId)) throw new Error('invalid transaction id');
  const authRes = await fetch(`${config.baseUrl}${config.authPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: config.apiKey }),
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  });
  const auth = (await authRes.json().catch(() => null)) as { token?: string } | null;
  if (!authRes.ok || !auth?.token) throw new Error(`paymob auth failed (HTTP ${authRes.status})`);

  const res = await fetch(`${config.baseUrl}${config.inquiryPath.replace('{id}', transactionId)}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`paymob inquiry failed (HTTP ${res.status})`);
  const tx = normalizeInquiry(await res.json().catch(() => null));
  if (!tx || tx.id !== transactionId) throw new Error('paymob inquiry returned a different or invalid transaction');
  return tx;
}
