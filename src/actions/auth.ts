"use server";

import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  checkAdminPassword,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from "@/lib/admin-auth";

export async function loginAdmin(
  password: string
): Promise<{ success: boolean }> {
  if (!checkAdminPassword(password)) {
    return { success: false };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), getAdminSessionCookieOptions());

  return { success: true };
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
