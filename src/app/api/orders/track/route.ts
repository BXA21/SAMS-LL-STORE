import { apiError } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
// Hard cap on billed execution time if a downstream call hangs.
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

/*
 * Retired. Looking an order up by order number plus email/phone proved nothing
 * about who is asking (anyone who knows a customer's phone could walk the
 * sequential order numbers). Customers now get delivery updates from the SAMS
 * team on WhatsApp; this endpoint reveals no order data.
 */
export async function POST() {
  return apiError(
    410,
    'GONE',
    'Online order lookup is no longer available. Please message SAMS on WhatsApp with your order number for delivery updates.'
  );
}
