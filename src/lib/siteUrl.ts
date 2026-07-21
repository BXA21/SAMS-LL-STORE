/**
 * Resolves the public origin of the deployed site.
 *
 * Never returns a localhost URL outside of local development: a localhost
 * origin that leaks into production metadata or a payment redirect is
 * unreachable for every visitor except the developer running `next dev`.
 */

// Canonical production origin. Used as the last resort so that a missing
// NEXT_PUBLIC_SITE_URL can degrade to the real site instead of localhost.
// Keep in step with the Netlify project name; the previous
// samsllc.netlify.app address was released when the project was renamed.
export const PRODUCTION_SITE_URL = 'https://samsllcoman.netlify.app';

const LOCAL_SITE_URL = 'http://localhost:3000';

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function isUsable(url: string | undefined): url is string {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build/runtime origin, resolved from configuration only.
 *
 * Order: explicit config, then the origin Netlify injects for the deploy,
 * then the canonical production origin. Localhost is only used when the app
 * is actually running in development.
 */
export function getSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    // Netlify injects these; URL is the primary site origin, DEPLOY_PRIME_URL
    // the origin of the current branch/preview deploy.
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
  ];

  for (const candidate of candidates) {
    if (isUsable(candidate)) return normalize(candidate);
  }

  return process.env.NODE_ENV === 'development' ? LOCAL_SITE_URL : PRODUCTION_SITE_URL;
}

/**
 * Origin for a specific inbound request.
 *
 * Deriving the origin from the request the visitor actually made is immune to
 * misconfigured environment variables, so redirects always land back on the
 * host the customer is browsing. Falls back to {@link getSiteUrl}.
 */
export function getSiteUrlFromRequest(request: Request): string {
  const headers = request.headers;
  const forwardedHost = headers.get('x-forwarded-host') ?? headers.get('host');

  if (forwardedHost) {
    const proto =
      headers.get('x-forwarded-proto') ??
      (forwardedHost.startsWith('localhost') || forwardedHost.startsWith('127.0.0.1')
        ? 'http'
        : 'https');
    const origin = `${proto}://${forwardedHost}`;
    if (isUsable(origin)) return normalize(origin);
  }

  return getSiteUrl();
}
