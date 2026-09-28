import { NextResponse } from 'next/server';
import { logServer } from '@/lib/apiHelpers';
import { verifyRedirectHmac } from '@/lib/paymob';
import { getPaymobConfig } from '@/lib/serverEnv';
import { getSiteUrl } from '@/lib/siteUrl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN = /^[a-f0-9]{48}$/;

/**
 * Where Paymob sends the customer's browser after payment.
 *
 * Display only: this route never writes payment state. Orders become paid
 * solely through the server-to-server webhook (/api/paymob/webhook). The
 * result page reads the real status from the database and waits for it.
 * The redirect signature is checked only so tampering shows up in the logs.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get('token') ?? '';
  const resultUrl = new URL('/checkout/result', getSiteUrl());
  if (TOKEN.test(token)) resultUrl.searchParams.set('token', token);

  const paymob = getPaymobConfig();
  if (paymob && params.has('hmac') && !verifyRedirectHmac(paymob.hmacSecret, params)) {
    logServer('paymob_return_bad_hmac', { transaction: params.get('id') ?? '' });
  }

  return NextResponse.redirect(resultUrl, { status: 303 });
}
