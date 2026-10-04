-- Failed admin login attempts, used to rate-limit the login form
-- (5 failures per IP per 15 minutes — see src/lib/login-rate-limit.ts).
-- Admin-only table: RLS enabled with NO policies, so only the service-role
-- key (server-side) can read or write it; the public anon key gets nothing.
-- If this table is missing the app falls back to a per-instance in-memory
-- limiter, which is weaker on serverless — run this migration to enable the
-- shared, durable limiter.

create table if not exists admin_login_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists admin_login_attempts_ip_time_idx
  on admin_login_attempts (ip, attempted_at desc);

alter table admin_login_attempts enable row level security;

NOTIFY pgrst, 'reload schema';
