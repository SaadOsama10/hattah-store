import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Public, read-only Supabase client (anon key). RLS restricts this key to
 * SELECT on products/product_images/categories. Safe to use in Server and
 * Client Components alike.
 *
 * Every page reading through this client already opts out of Next.js's
 * page-level caching via `dynamic = "force-dynamic"`, but that alone
 * doesn't stop Next's fetch-level Data Cache from still caching the
 * underlying REST calls this client makes — a stale product/price/stock
 * read is never acceptable here, so `cache: "no-store"` is forced on
 * every request this client issues.
 */
export function getPublicSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
