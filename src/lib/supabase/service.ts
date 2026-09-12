import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Privileged Supabase client (service role key). Bypasses RLS — must only
 * ever be imported from server actions / route handlers in src/actions,
 * never from a Client Component. The `server-only` import enforces this
 * at build time.
 */
export function getServiceSupabaseClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export const PRODUCT_IMAGES_BUCKET = "product-images";
