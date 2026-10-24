-- OpenAI Batch API jobs for the daily generation: one row per submitted batch.
-- generate.ts --batch inserts the day's posts (draft, no image yet) and one batch; collect.ts finishes them.
create table if not exists social_batches (
  id uuid primary key default gen_random_uuid(),
  openai_batch_id text not null,
  target_date date not null,
  status text not null default 'submitted' check (status in ('submitted', 'collected')),
  -- custom_id (= social_posts.id) → { mode, product_id, angle }
  items jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_checked_at timestamptz,
  collected_at timestamptz
);
create index if not exists social_batches_status_idx on social_batches (status, created_at);
alter table social_batches enable row level security;

notify pgrst, 'reload schema';
