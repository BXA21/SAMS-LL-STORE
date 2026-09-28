import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerConfig } from '@/lib/serverEnv';

let client: SupabaseClient | null = null;

/**
 * Service-role client for route handlers. It bypasses row level security, so it
 * is only ever used to call the narrow SECURITY DEFINER functions and payment
 * tables that customers must not reach directly. Returns null when the database
 * is not configured so callers can answer with a clean 503.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (client) return client;
  const config = getSupabaseServerConfig();
  if (!config) return null;
  client = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
