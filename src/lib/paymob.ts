import 'server-only';
import crypto from 'crypto';
import type { PaymobConfig } from '@/lib/serverEnv';

/*
 * Paymob Oman client: Unified Intention API + Unified Checkout.
 * Card data is entered on Paymob's hosted page, never on this site.
 * Docs: https://developers.paymob.com/paymob-docs/intention-apis/create-intention
 */

export interface IntentionItem {
  name: string;
  /** Minor units (baisa: 1 OMR = 1000). */
  amount: number;
  quantity: number;
  description?: string;
}

export interface IntentionRequest {
  amountMinor: number;
  currency: 'OMR';
  items: IntentionItem[];
  customer: { fullName: string; email: string; phone: string; address: string };
  specialReference: string;
  notificationUrl: string;
  redirectionUrl: string;
}

export interface IntentionResponse {
  id: string;
  clientSecret: string;
  intentionOrderId: string | null;
}

export class PaymobError extends Error {
  readonly status?: number;
  readonly detail?: unknown;

  constructor(message: string, status?: number, detail?: unknown) {
    super(message);
    this.name = 'PaymobError';
    this.status = status;
    this.detail = detail;
  }
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] || 'Customer';
  const last = parts.slice(1).join(' ') || first;
  return { first, last };
}

export async function createIntention(config: PaymobConfig, req: IntentionRequest): Promise<IntentionResponse> {
  const { first, last } = splitName(req.customer.fullName);
  const body = {
    amount: req.amountMinor,
    currency: req.currency,
    payment_methods: config.integrationIds,
    items: req.items.map((item) => ({
      name: item.name.slice(0, 50),
      amount: item.amount,
      quantity: item.quantity,
      description: (item.description ?? item.name).slice(0, 255),
    })),
    billing_data: {
      first_name: first.slice(0, 50),
      last_name: last.slice(0, 50),
      email: req.customer.email,
      phone_number: req.customer.phone,
      street: req.customer.address.slice(0, 100) || 'NA',
      building: 'NA',
      apartment: 'NA',
      floor: 'NA',
      city: 'NA',
      state: 'NA',
      country: 'OM',
      postal_code: 'NA',
    },
    customer: { first_name: first.slice(0, 50), last_name: last.slice(0, 50), email: req.customer.email },
    special_reference: req.specialReference,
    notification_url: req.notificationUrl,
    redirection_url: req.redirectionUrl,
    expiration: 3600,
  };

  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/v1/intention/`, {
      method: 'POST',
      headers: { Authorization: `Token ${config.secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
  } catch (err) {
    throw new PaymobError('Paymob is unreachable', undefined, err instanceof Error ? err.message : err);
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok || !data || typeof data !== 'object') {
    throw new PaymobError('Paymob rejected the payment intention', res.status, data);
  }

  const record = data as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : String(record.id ?? '');
  const clientSecret = typeof record.client_secret === 'string' ? record.client_secret : '';
  if (!id || !clientSecret) {
    throw new PaymobError('Paymob response is missing the client secret', res.status, data);
  }

  const intentionOrderId = record.intention_order_id ?? null;
  return { id, clientSecret, intentionOrderId: intentionOrderId === null ? null : String(intentionOrderId) };
}

export function unifiedCheckoutUrl(config: PaymobConfig, clientSecret: string): string {
  const url = new URL(`${config.baseUrl}/unifiedcheckout/`);
  url.searchParams.set('publicKey', config.publicKey);
  url.searchParams.set('clientSecret', clientSecret);
  return url.toString();
}

// --- HMAC -------------------------------------------------------------------

/*
 * Field order for the transaction callback HMAC, per Paymob's documentation.
 * The POST "processed" callback carries these inside `obj` (order id at
 * obj.order.id); the GET "response" redirect carries them as query params.
 */
const HMAC_FIELDS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
] as const;

function stringify(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value);
}

function sign(secret: string, message: string): string {
  return crypto.createHmac('sha512', secret).update(message, 'utf8').digest('hex');
}

function safeEqualHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received.trim().toLowerCase(), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/** Verifies the HMAC of a POST transaction callback's `obj`. */
export function verifyCallbackHmac(secret: string, obj: Record<string, unknown>, received: string | null): boolean {
  if (!received) return false;
  const message = HMAC_FIELDS.map((field) => stringify(readPath(obj, field))).join('');
  return safeEqualHex(sign(secret, message), received);
}

/** Verifies the HMAC of the GET redirect's query string. */
export function verifyRedirectHmac(secret: string, params: URLSearchParams): boolean {
  const received = params.get('hmac');
  if (!received) return false;
  // Paymob documents the order id as `order_id` here, while live redirects
  // send `order`; accept whichever one produces a valid signature.
  const orderCandidates = [params.get('order'), params.get('order_id')].filter((v): v is string => v !== null);
  if (orderCandidates.length === 0) orderCandidates.push('');

  return orderCandidates.some((orderId) => {
    const message = HMAC_FIELDS.map((field) => {
      if (field === 'order.id') return orderId;
      return params.get(field) ?? '';
    }).join('');
    return safeEqualHex(sign(secret, message), received);
  });
}

export interface NormalizedTransaction {
  transactionId: string;
  /** Signed (HMAC field order.id): the only value used to find the payment. */
  providerOrderId: string | null;
  /** Unsigned merchant_order_id: must agree with the binding, never selects it. */
  merchantReference: string | null;
  integrationId: number | null;
  amountMinor: number | null;
  currency: string | null;
  success: boolean;
  pending: boolean;
  isRefunded: boolean;
  isVoided: boolean;
  isAuth: boolean;
  isCapture: boolean;
}

function asBool(value: unknown): boolean {
  return value === true || value === 'true';
}

/** Exact integer minor units only; floats, exponents and garbage become null. */
function asMinorUnits(value: unknown): number | null {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (typeof value === 'string' && /^[0-9]{1,15}$/.test(value)) return Number(value);
  return null;
}

function asId(value: unknown): string | null {
  const text = stringify(value);
  return /^[0-9]{1,32}$/.test(text) ? text : null;
}

export function normalizeCallback(obj: Record<string, unknown>): NormalizedTransaction | null {
  const transactionId = asId(obj.id);
  if (!transactionId) return null;
  const order = (obj.order && typeof obj.order === 'object' ? obj.order : {}) as Record<string, unknown>;
  const integration = asId(obj.integration_id);
  const reference = stringify(order.merchant_order_id);
  return {
    transactionId,
    providerOrderId: asId(order.id),
    merchantReference: reference && reference.length <= 128 ? reference : null,
    integrationId: integration ? Number(integration) : null,
    amountMinor: asMinorUnits(obj.amount_cents),
    currency: stringify(obj.currency).slice(0, 8) || null,
    success: asBool(obj.success),
    pending: asBool(obj.pending),
    isRefunded: asBool(obj.is_refunded),
    isVoided: asBool(obj.is_voided),
    isAuth: asBool(obj.is_auth),
    isCapture: asBool(obj.is_capture),
  };
}
