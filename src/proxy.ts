import { NextResponse, type NextRequest } from 'next/server';

/*
 * The staff dashboard is reachable only through a private address,
 * /staff-<40 hex chars>, whose value lives in the ADMIN_PATH_KEY environment
 * variable (never in this repository). The real /admin route is internal: a
 * direct request to it gets the ordinary 404, so the dashboard's existence is
 * not advertised. This is defence in depth only — every dashboard read and
 * write still requires a signed-in staff account and is enforced by database
 * row-level security, so knowing the address grants nothing by itself.
 */

// Bare path: the store's language rewrite turns it into the branded 404 (an
// /ar/... target would trip the /ar -> / canonical redirect instead).
const NOT_FOUND = '/__not-found';

function sameKey(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.rewrite(new URL(NOT_FOUND, request.url), { status: 404 });
  }

  const key = process.env.ADMIN_PATH_KEY ?? '';
  const presented = pathname.slice(1);
  if (!/^staff-[a-f0-9]{40}$/.test(key) || !sameKey(presented, key)) {
    return NextResponse.rewrite(new URL(NOT_FOUND, request.url), { status: 404 });
  }

  const response = NextResponse.rewrite(new URL('/admin', request.url));
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export const config = {
  // Only these paths ever reach the proxy, so storefront pages stay static.
  matcher: ['/admin', '/admin/:path*', '/:key(staff-[a-f0-9]{40})'],
};
