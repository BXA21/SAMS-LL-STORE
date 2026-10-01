import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

/*
 * Rate-limit identity for a request.
 *
 * Trust boundary: only ONE header is read, and only when the deployment says
 * which header its edge sets: CLIENT_IP_HEADER when configured, otherwise
 * inferred from the platform. On Vercel that is `x-vercel-forwarded-for`
 * (Vercel overwrites it with the real client address and, unlike
 * X-Forwarded-For, it survives any proxy placed in front); on Netlify it is
 * `x-nf-client-connection-ip`.
 * X-Forwarded-For, X-Real-IP and every other client-controllable header are
 * ignored, so a caller cannot pick a fresh identity per request.
 *
 * A missing or malformed trusted value never becomes a new identity: it falls
 * into one shared "unattributed" bucket. Whether the host strips a
 * client-supplied copy of the header must be verified on staging.
 */

const MAX_HEADER_VALUE_LENGTH = 64;
const HEADER_NAME = /^[a-z0-9-]{1,64}$/;

export type IdentitySource = 'trusted-header' | 'unattributed' | 'local-dev';

export interface ClientIdentity {
  source: IdentitySource;
  /** Normalised IPv4 address, IPv6 /64 prefix, or a fixed shared label. */
  value: string;
}

export function trustedClientIpHeader(env: NodeJS.ProcessEnv = process.env): string | null {
  const configured = env.CLIENT_IP_HEADER?.trim().toLowerCase();
  if (configured) return HEADER_NAME.test(configured) ? configured : null;
  if (env.VERCEL === '1') return 'x-vercel-forwarded-for';
  if (env.NETLIFY === 'true') return 'x-nf-client-connection-ip';
  return null;
}

function expandIpv6(ip: string): string[] | null {
  const halves = ip.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 && head.length !== 8) return null;
  if (halves.length === 2 && missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => g.padStart(4, '0'));
}

/**
 * Validates one IP address. IPv4 (and IPv4-mapped IPv6) is returned as-is;
 * IPv6 is reduced to its /64 prefix so rotating addresses inside one
 * allocation cannot evade limits. Anything else returns null.
 */
export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_HEADER_VALUE_LENGTH) return null;

  const ip = trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed;
  if (ip.includes('%')) return null; // zone ids are never a public client address

  const version = isIP(ip);
  if (version === 4) return ip;
  if (version !== 6) return null;

  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped && isIP(mapped[1]) === 4) return mapped[1];

  const groups = expandIpv6(lower);
  if (!groups) return null;
  return `${groups.slice(0, 4).join(':')}::/64`;
}

export function clientIdentity(
  headers: Headers,
  env: NodeJS.ProcessEnv = process.env
): ClientIdentity {
  const header = trustedClientIpHeader(env);
  if (header) {
    const ip = normalizeIp(headers.get(header));
    return ip ? { source: 'trusted-header', value: ip } : { source: 'unattributed', value: 'unattributed' };
  }
  if (env.NODE_ENV !== 'production') return { source: 'local-dev', value: 'local-dev' };
  return { source: 'unattributed', value: 'unattributed' };
}

/** Fixed-length storage key; the raw address never reaches the database or logs. */
export function rateLimitKey(bucket: string, identity: ClientIdentity): string {
  const digest = createHash('sha256').update(`${identity.source}|${identity.value}`).digest('hex').slice(0, 40);
  return `${bucket.slice(0, 24)}:${digest}`;
}
