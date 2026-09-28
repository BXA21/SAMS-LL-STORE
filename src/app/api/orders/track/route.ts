import { apiError, apiOk, logServer, readJson, withinRateLimit } from '@/lib/apiHelpers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { trackSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Order tracking. Requires the order number AND the email or phone used at
 * checkout, and returns only that order's status and item names; no address,
 * no other customer's data.
 */
export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  if (!db) return apiError(503, 'SERVICE_UNAVAILABLE', 'Order tracking is temporarily unavailable.');

  const body = await readJson(request, trackSchema);
  if (!body.ok) return body.response;

  if (!(await withinRateLimit(db, 'track', request, 20, 600))) {
    return apiError(429, 'RATE_LIMITED', 'Too many lookups. Please wait a few minutes and try again.');
  }

  const { data, error } = await db.rpc('track_order', {
    p_order_number: body.value.orderNumber,
    p_contact: body.value.contact,
  });
  if (error) {
    logServer('track_order_failed', { message: error.message });
    return apiError(500, 'INTERNAL_ERROR', 'We could not look up that order. Please try again.');
  }

  const order = (Array.isArray(data) ? data[0] : null) as TrackRow | null;
  if (!order) {
    return apiError(404, 'NOT_FOUND', 'No order matches that order number and contact detail.');
  }
  const { customer_name, email, address, ...rest } = order;
  return apiOk({
    ...rest,
    total_amount: Number(rest.total_amount),
    items: rest.items ?? [],
    customer_name_masked: maskName(customer_name),
    email_masked: maskEmail(email),
    address_masked: maskAddress(address),
  });
}

interface TrackRow {
  order_number: string;
  order_type: string;
  status: string;
  payment_status: string;
  total_amount: number | string;
  currency: string;
  items: unknown[] | null;
  customer_name: string;
  email: string;
  address: string;
  created_at: string;
  updated_at: string;
}

function maskName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] + '*'.repeat(Math.max(part.length - 1, 1)))
    .join(' ');
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

function maskAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : '***';
}
