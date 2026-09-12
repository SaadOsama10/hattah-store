// Pure constants with zero runtime dependencies — safe to import from
// both Node.js code (server actions, layouts) and the Edge-runtime
// middleware, which can't use Node's `crypto` module.

export const ADMIN_SESSION_COOKIE = "hattah_admin_session";
export const ADMIN_SESSION_PAYLOAD = "hattah-admin-authenticated";

/** Sliding session lifetime: every authenticated request to a protected
 * admin route (checked in middleware) refreshes the cookie by this much,
 * so a session expires after this long of real inactivity — not on a
 * fixed countdown from login, and never indefinitely. */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 2; // 2 hours
