/**
 * Resolves the public origin of the deployed site.
 *
 * Never returns a localhost URL outside of local development: a localhost
 * origin that leaks into production metadata or a payment redirect is
 * unreachable for every visitor except the developer running `next dev`.
 */

// Canonical production origin. Used as the last resort so that a missing
// NEXT_PUBLIC_SITE_URL can degrade to the real site instead of localhost.
// The live store's canonical address (Netlify site samsllcoman). Production
// also sets NEXT_PUBLIC_SITE_URL to it explicitly.
export const PRODUCTION_SITE_URL = 'https://samsoman.com';

const LOCAL_SITE_URL = 'http://localhost:3000';

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Vercel system variables carry a bare host; NEXT_PUBLIC_ copies are also exposed to the browser. */
function vercelOrigin(): string | undefined {
  const production = process.env.VERCEL_ENV === 'production' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';
  const host = production
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    : process.env.VERCEL_BRANCH_URL ?? process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL ?? process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL;
  return host ? `https://${host}` : undefined;
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
 * Order: explicit config, then the origin Vercel (or Netlify) injects for the
 * deploy, then the canonical production origin. Localhost is only used when the app
 * is actually running in development.
 */
export function getSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    vercelOrigin(),
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
