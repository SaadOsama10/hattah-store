import type { SupabaseClient } from "@supabase/supabase-js";
import { SOCIAL_BUCKET } from "./db.js";

/** Object path inside the public social-posts bucket for one of its public URLs (or null). */
export function bucketPath(publicUrl: string): string | null {
  const m = publicUrl.match(new RegExp(`/object/public/${SOCIAL_BUCKET}/(.+)$`));
  return m ? decodeURIComponent(m[1].split("?")[0]) : null;
}

export async function removeFromBucket(sb: SupabaseClient, publicUrl: string) {
  const p = bucketPath(publicUrl);
  if (p) await sb.storage.from(SOCIAL_BUCKET).remove([p]);
}
