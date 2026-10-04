import "server-only";
import { headers } from "next/headers";
import { getServiceSupabaseClient } from "@/lib/supabase/service";

export const MAX_FAILED_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export interface LockStatus {
  locked: boolean;
  retryAfterSeconds: number;
}

// Per-instance fallback, used only if the admin_login_attempts table is
// unavailable (e.g. migration 012 not applied yet). On serverless each
// instance has its own copy, so this is best-effort — the table is what
// makes the limit shared and durable.
const memory = new Map<string, number[]>();

/** Client IP as seen by the platform proxy. Vercel overwrites
 * x-forwarded-for, so its first entry is the real client address. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || "unknown";
}

function status(timestamps: number[], now: number): LockStatus {
  const recent = timestamps.filter((t) => now - t < WINDOW_MS).sort((a, b) => a - b);
  if (recent.length < MAX_FAILED_ATTEMPTS) return { locked: false, retryAfterSeconds: 0 };
  // The lock lifts when enough old failures age out of the window.
  const unlockAt = recent[recent.length - MAX_FAILED_ATTEMPTS] + WINDOW_MS;
  return { locked: true, retryAfterSeconds: Math.max(1, Math.ceil((unlockAt - now) / 1000)) };
}

async function dbAttempts(ip: string): Promise<number[] | null> {
  try {
    const supabase = getServiceSupabaseClient();
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data, error } = await supabase
      .from("admin_login_attempts")
      .select("attempted_at")
      .eq("ip", ip)
      .gte("attempted_at", since);
    if (error) return null;
    // Opportunistic cleanup keeps the table tiny.
    void supabase.from("admin_login_attempts").delete().lt("attempted_at", since);
    return (data ?? []).map((r) => new Date(r.attempted_at).getTime());
  } catch {
    return null;
  }
}

export async function getLockStatus(ip: string): Promise<LockStatus> {
  const now = Date.now();
  const fromDb = await dbAttempts(ip);
  const timestamps = fromDb ?? memory.get(ip) ?? [];
  return status(timestamps, now);
}

export async function recordFailedAttempt(ip: string): Promise<void> {
  const now = Date.now();
  const recent = (memory.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  memory.set(ip, recent);
  try {
    const { error } = await getServiceSupabaseClient()
      .from("admin_login_attempts")
      .insert({ ip });
    if (error) console.warn("admin_login_attempts unavailable, using in-memory limiter");
  } catch {
    // memory fallback already recorded above
  }
}

export async function clearAttempts(ip: string): Promise<void> {
  memory.delete(ip);
  try {
    await getServiceSupabaseClient().from("admin_login_attempts").delete().eq("ip", ip);
  } catch {
    // nothing to clear
  }
}
