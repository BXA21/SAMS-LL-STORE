import 'server-only';

/*
 * Guest access to ONE order's payment status.
 *
 * The order's random 48-hex token is handed to the buyer's browser as an
 * HttpOnly cookie when checkout starts, so it never appears in a URL (no
 * referrer or access-log leakage) and page scripts cannot read it. It expires
 * after 24 hours in the browser, and the database refuses tokens for orders
 * older than 7 days. It reveals status and total only: no contact details,
 * address or order history.
 */

export const ORDER_ACCESS_COOKIE = 'sams_order_access';
export const ORDER_ACCESS_TOKEN = /^[a-f0-9]{48}$/;

export function orderAccessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24,
  };
}

/** Reads the order-access token from the request cookies, or null. */
export function readOrderAccessToken(request: Request): string | null {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === ORDER_ACCESS_COOKIE) {
      const value = decodeURIComponent(rest.join('='));
      return ORDER_ACCESS_TOKEN.test(value) ? value : null;
    }
  }
  return null;
}
