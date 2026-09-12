import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  ADMIN_SESSION_PAYLOAD,
} from "./lib/admin-session-shared";

const intlMiddleware = createMiddleware(routing);

// Edge-runtime-compatible HMAC-SHA256 (Web Crypto — Node's `crypto`
// module isn't available in middleware) producing the exact same hex
// digest as the Node implementation in src/lib/admin-auth.ts, so a
// session created by the login action verifies correctly here.
async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function createAdminSessionToken(): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return "";
  return hmacSha256Hex(secret, ADMIN_SESSION_PAYLOAD);
}

async function isValidAdminSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await createAdminSessionToken();
  if (!expected) return false;
  return constantTimeEqual(token, expected);
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);

  const hasLocalePrefix = routing.locales.includes(
    segments[0] as (typeof routing.locales)[number]
  );
  const locale = hasLocalePrefix ? segments[0] : routing.defaultLocale;
  const rest = hasLocalePrefix ? segments.slice(1) : segments;

  const isAdminArea = rest[0] === "admin";
  const isAdminLogin = isAdminArea && rest[1] === "login";
  const isProtectedAdminRoute = isAdminArea && !isAdminLogin;

  if (isProtectedAdminRoute) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!(await isValidAdminSessionToken(token))) {
      const loginUrl = new URL(`/${locale}/admin/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = intlMiddleware(request);

  if (isProtectedAdminRoute) {
    // Sliding expiration: every authenticated request to a protected
    // admin route refreshes the cookie, so the session expires after a
    // real period of inactivity rather than a fixed countdown from login.
    response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
