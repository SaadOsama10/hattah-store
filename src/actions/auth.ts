"use server";

import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  checkAdminPassword,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from "@/lib/admin-auth";
import {
  clearAttempts,
  getClientIp,
  getLockStatus,
  recordFailedAttempt,
} from "@/lib/login-rate-limit";

export type LoginResult =
  | { success: true }
  | { success: false; locked: boolean; retryAfterSeconds: number };

export async function loginAdmin(password: string): Promise<LoginResult> {
  const ip = await getClientIp();

  // Check the lock first so a locked-out client can't keep probing
  // passwords — even a correct one is refused until the window passes.
  const lock = await getLockStatus(ip);
  if (lock.locked) {
    return { success: false, locked: true, retryAfterSeconds: lock.retryAfterSeconds };
  }

  if (!checkAdminPassword(password)) {
    await recordFailedAttempt(ip);
    const after = await getLockStatus(ip);
    return { success: false, locked: after.locked, retryAfterSeconds: after.retryAfterSeconds };
  }

  await clearAttempts(ip);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), getAdminSessionCookieOptions());

  return { success: true };
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
