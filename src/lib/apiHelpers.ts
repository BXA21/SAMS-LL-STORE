import 'server-only';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ZodType } from 'zod';
import { clientIdentity, rateLimitKey } from '@/lib/clientIp';

export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'ONLINE_PAYMENT_UNAVAILABLE'
  | 'PRODUCT_NOT_FOUND'
  | 'NOT_FOUND'
  | 'GONE'
  | 'PAYMENT_GATEWAY_ERROR'
  | 'INTERNAL_ERROR';

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra?: Record<string, unknown>,
  headers?: Record<string, string>
) {
  return NextResponse.json(
    { error: { code, message, ...extra } },
    { status, headers: { 'Cache-Control': 'no-store', ...headers } }
  );
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Structured server log line. Callers must not pass secrets or personal data. */
export function logServer(event: string, detail: Record<string, unknown> = {}) {
  process.stderr.write(`${JSON.stringify({ ts: new Date().toISOString(), event, ...detail })}\n`);
}

let warnedUnattributed = false;

export type RateLimitResult = { ok: true } | { ok: false; response: NextResponse };

/**
 * Shared (database-backed) fixed-window limit keyed by the trusted client
 * identity. Fails closed: if the limiter cannot answer, the request is refused
 * with a retryable 503 and no order or payment is created.
 */
export async function enforceRateLimit(
  db: SupabaseClient,
  bucket: string,
  request: Request,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const identity = clientIdentity(request.headers);
  if (identity.source === 'unattributed' && !warnedUnattributed) {
    warnedUnattributed = true;
    // In production this usually means CLIENT_IP_HEADER is not configured, which
    // collapses every visitor into one shared bucket. Deployment must set it.
    logServer('rate_limit_unattributed_client', {
      level: 'error',
      bucket,
      configured: Boolean(process.env.CLIENT_IP_HEADER),
      hint: 'Trusted client IP header missing or invalid; set CLIENT_IP_HEADER=x-nf-client-connection-ip on Netlify',
    });
  }

  let allowed: unknown;
  try {
    const { data, error } = await db.rpc('check_rate_limit', {
      p_key: rateLimitKey(bucket, identity),
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) throw new Error(error.message);
    allowed = data;
  } catch (err) {
    logServer('rate_limit_unavailable', { bucket, message: err instanceof Error ? err.message.slice(0, 200) : 'unknown' });
    return {
      ok: false,
      response: apiError(503, 'SERVICE_UNAVAILABLE', 'We are busy right now. Please try again in a moment.', undefined, { 'Retry-After': '30' }),
    };
  }

  if (allowed !== true) {
    return {
      ok: false,
      response: apiError(429, 'RATE_LIMITED', 'Too many attempts. Please wait a few minutes and try again.', undefined, {
        'Retry-After': String(windowSeconds),
      }),
    };
  }
  return { ok: true };
}

const MAX_BODY_BYTES = 16 * 1024;

/** Reads and validates a JSON body with a hard size cap. */
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<{ ok: true; value: T } | { ok: false; response: NextResponse }> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return { ok: false, response: apiError(415, 'INVALID_REQUEST', 'Expected a JSON request.') };
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return { ok: false, response: apiError(413, 'INVALID_REQUEST', 'Request is too large.') };
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, response: apiError(400, 'INVALID_REQUEST', 'Request body is not valid JSON.') };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    return { ok: false, response: apiError(400, 'INVALID_REQUEST', 'Please check the highlighted fields.', { fields }) };
  }
  return { ok: true, value: parsed.data };
}
