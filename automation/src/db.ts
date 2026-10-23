import { createClient } from "@supabase/supabase-js";
import { need } from "./env.js";

export function getSupabase() {
  return createClient(need("SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

export const SOCIAL_BUCKET = "social-posts";
