import 'server-only';
import { z } from 'zod';

/*
 * Server-only configuration. Nothing here may ever be prefixed NEXT_PUBLIC_,
 * because Next.js inlines those into the browser bundle.
 */

const PLACEHOLDER = /placeholder|your-|changeme/i;

const realValue = z
  .string()
  .trim()
  .min(1)
  .refine((v) => !PLACEHOLDER.test(v), 'placeholder value');

const supabaseSchema = z.object({
  url: z.string().url().refine((v) => !PLACEHOLDER.test(v), 'placeholder value'),
  serviceRoleKey: realValue,
});

const paymobSchema = z.object({
  baseUrl: z.string().url(),
  secretKey: realValue,
  publicKey: realValue,
  hmacSecret: realValue,
  integrationIds: z.array(z.number().int().positive()).min(1),
  callbackBaseUrl: z.string().url().optional(),
});

export type PaymobConfig = z.infer<typeof paymobSchema>;

type KeyMode = 'live' | 'test' | 'unknown';

/** Paymob keys carry their mode in the prefix, e.g. omn_sk_test_… / omn_sk_live_…. */
export function paymobKeyMode(key: string): KeyMode {
  if (/_test_/i.test(key)) return 'test';
  if (/_live_/i.test(key)) return 'live';
  return 'unknown';
}

/**
 * 'production' | 'preview' | undefined for the running deployment. Netlify's
 * CONTEXT (production / deploy-preview / branch-deploy) and Vercel's VERCEL_ENV
 * are both understood; SAMS_DEPLOY_ENV overrides when set explicitly.
 */
export function deploymentEnvironment(env: NodeJS.ProcessEnv = process.env): 'production' | 'preview' | undefined {
  const explicit = env.SAMS_DEPLOY_ENV ?? env.VERCEL_ENV;
  if (explicit === 'production' || explicit === 'preview') return explicit;
  if (env.CONTEXT === 'production') return 'production';
  if (env.CONTEXT === 'deploy-preview' || env.CONTEXT === 'branch-deploy') return 'preview';
  return undefined;
}

/**
 * Refuses key sets that are in the wrong mode for where they run: test keys on
 * the production deployment (customers would "pay" without being charged),
 * live keys on a preview deployment (testing would charge real cards), or a secret
 * and public key from different modes. Unrecognised prefixes are allowed so a
 * format change at Paymob cannot silently switch checkout off.
 */
export function paymobModeProblem(secretKey: string, publicKey: string, deployEnv = deploymentEnvironment()): string | null {
  const secret = paymobKeyMode(secretKey);
  const pub = paymobKeyMode(publicKey);
  if (secret !== 'unknown' && pub !== 'unknown' && secret !== pub) return 'secret and public keys are from different modes';
  const mode = secret !== 'unknown' ? secret : pub;
  if (deployEnv === 'production' && mode === 'test') return 'test keys configured on the production deployment';
  if (deployEnv === 'preview' && mode === 'live') return 'live keys configured on a preview deployment';
  return null;
}

let reportedModeProblem = false;

export function getSupabaseServerConfig() {
  const parsed = supabaseSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  return parsed.success ? parsed.data : null;
}

export function getPaymobConfig(): PaymobConfig | null {
  const integrationIds = (process.env.PAYMOB_INTEGRATION_ID ?? '')
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);

  const parsed = paymobSchema.safeParse({
    baseUrl: (process.env.PAYMOB_BASE_URL || 'https://oman.paymob.com').replace(/\/api\/?$/, '').replace(/\/+$/, ''),
    secretKey: process.env.PAYMOB_SECRET_KEY,
    publicKey: process.env.PAYMOB_PUBLIC_KEY,
    hmacSecret: process.env.PAYMOB_HMAC_SECRET,
    integrationIds,
    callbackBaseUrl: process.env.PAYMOB_CALLBACK_BASE_URL || undefined,
  });
  if (!parsed.success) return null;
  const problem = paymobModeProblem(parsed.data.secretKey, parsed.data.publicKey);
  if (problem) {
    if (!reportedModeProblem) {
      reportedModeProblem = true;
      process.stderr.write(`${JSON.stringify({ ts: new Date().toISOString(), event: 'paymob_key_mode_rejected', level: 'error', problem })}\n`);
    }
    return null;
  }
  return parsed.data;
}

/** Online card payment is offered only when both the database and Paymob are fully configured. */
export function isOnlinePaymentEnabled(): boolean {
  return getSupabaseServerConfig() !== null && getPaymobConfig() !== null;
}
