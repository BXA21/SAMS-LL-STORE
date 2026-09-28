import 'server-only';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ZodType } from 'zod';

export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'ONLINE_PAYMENT_UNAVAILABLE'
  | 'PRODUCT_NOT_FOUND'
  | 'NOT_FOUND'
  | 'PAYMENT_GATEWAY_ERROR'
  | 'INTERNAL_ERROR';

export function apiError(status: number, code: ApiErrorCode, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Structured server log line; never includes secrets or full card data. */
export function logServer(event: string, detail: Record<string, unknown> = {}) {
  process.stderr.write(`${JSON.stringify({ ts: new Date().toISOString(), event, ...detail })}\n`);
}

export function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get('x-nf-client-connection-ip') ||
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/** Returns true when the request is within its budget. Fails open only if the limiter itself errors. */
export async function withinRateLimit(
  db: SupabaseClient,
  bucket: string,
  request: Request,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  const { data, error } = await db.rpc('check_rate_limit', {
    p_key: `${bucket}:${clientIp(request)}`,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    logServer('rate_limit_error', { bucket, message: error.message });
    return true;
  }
  return data === true;
}

const MAX_BODY_BYTES = 16 * 1024;

/** Reads and validates a JSON body with a hard size cap. */
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<{ ok: true; value: T } | { ok: false; response: NextResponse }> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return { ok: false, response: apiError(415,'INVALID_REQUEST', 'Expected a JSON request.') };
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
