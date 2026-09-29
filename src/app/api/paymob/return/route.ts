import { NextResponse } from 'next/server';
import { logServer } from '@/lib/apiHelpers';
import { verifyRedirectHmac } from '@/lib/paymob';
import { getPaymobConfig } from '@/lib/serverEnv';
import { getSiteUrl } from '@/lib/siteUrl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Where Paymob sends the customer's browser after payment.
 *
 * Display only: this route never writes payment state and passes nothing from
 * the query string on. Orders become paid solely through the server-to-server
 * webhook; the result page reads the real status using the buyer's
 * order-access cookie. The signature is checked only so tampering is logged.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const paymob = getPaymobConfig();
  if (paymob && params.has('hmac') && !verifyRedirectHmac(paymob.hmacSecret, params)) {
    logServer('paymob_return_bad_hmac');
  }
  return NextResponse.redirect(new URL('/checkout/result', getSiteUrl()), { status: 303 });
}
