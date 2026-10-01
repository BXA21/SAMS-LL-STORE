import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Public (anon) client. Safe to ship to the browser: row level security limits
// it to the active catalog, and to a staff member's own permissions once signed in.
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
);

/** How stale prerendered storefront pages may get after a dashboard edit. */
export const CATALOG_REVALIDATE_SECONDS = 300;

/*
 * On the server, public catalog reads come from prerendered pages. Without an
 * explicit lifetime Next.js stores those responses in its data cache with no
 * expiry, and that cache survives rebuilds (locally and in Vercel's build
 * cache), so product, price and translation edits would never reach the
 * pages. GET reads are therefore cached for a bounded window, which also makes
 * the pages incrementally regenerate on that interval. Writes and RPCs are
 * never cached.
 */
const serverFetch: typeof fetch = (input, init) => {
  const method = (init?.method ?? 'GET').toUpperCase();
  if (method !== 'GET') return fetch(input, { ...init, cache: 'no-store' });
  return fetch(input, { ...init, next: { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ['catalog'] } });
};

const isBrowser = typeof window !== 'undefined';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: isBrowser, autoRefreshToken: isBrowser },
      ...(isBrowser ? {} : { global: { fetch: serverFetch } }),
    })
  : null;
