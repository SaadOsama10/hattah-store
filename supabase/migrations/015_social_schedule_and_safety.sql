-- 8 daily slots (5 feed + 3 stories) with a random per-slot offset, a stable
-- slot key for idempotent generation, and the failure circuit-breaker state.

alter table social_settings
  add column if not exists jitter_minutes int not null default 10,
  add column if not exists consecutive_failures int not null default 0,
  add column if not exists last_error text,
  add column if not exists auto_disabled_at timestamptz;

alter table social_posts
  add column if not exists slot_key text;

create index if not exists social_posts_slot_key_idx on social_posts (slot_key, scheduled_at);

alter table social_settings alter column daily_slots set default '[
  {"type":"feed","time":"09:30"},
  {"type":"story","time":"11:00"},
  {"type":"feed","time":"12:30"},
  {"type":"feed","time":"15:30"},
  {"type":"story","time":"17:00"},
  {"type":"feed","time":"18:30"},
  {"type":"feed","time":"21:30"},
  {"type":"story","time":"23:00"}
]'::jsonb;

update social_settings set daily_slots = '[
  {"type":"feed","time":"09:30"},
  {"type":"story","time":"11:00"},
  {"type":"feed","time":"12:30"},
  {"type":"feed","time":"15:30"},
  {"type":"story","time":"17:00"},
  {"type":"feed","time":"18:30"},
  {"type":"feed","time":"21:30"},
  {"type":"story","time":"23:00"}
]'::jsonb where id = 1;

notify pgrst, 'reload schema';
