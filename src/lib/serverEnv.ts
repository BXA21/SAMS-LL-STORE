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
  return parsed.success ? parsed.data : null;
}

/** Online card payment is offered only when both the database and Paymob are fully configured. */
export function isOnlinePaymentEnabled(): boolean {
  return getSupabaseServerConfig() !== null && getPaymobConfig() !== null;
}
