-- SEO / GEO support: editable image alt text, weekly site-health results, and
-- AI-suggested product descriptions awaiting approval.

alter table products
  add column if not exists image_alt_ar text,
  add column if not exists image_alt_en text,
  add column if not exists image_alt_tr text;

-- Latest result of the weekly SEO/performance check (single row, written by GitHub Actions).
create table if not exists seo_health (
  id int primary key default 1 check (id = 1),
  checked_at timestamptz,
  ok boolean not null default true,
  scores jsonb,
  problems jsonb not null default '[]'::jsonb,
  run_url text
);
insert into seo_health (id) values (1) on conflict (id) do nothing;

-- Suggested replacements for short/generic product descriptions (never applied automatically).
create table if not exists product_description_drafts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  lang text not null check (lang in ('ar', 'en', 'tr')),
  current_text text not null default '',
  suggested_text text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
-- at most one pending suggestion per product+language
create unique index if not exists product_description_drafts_one_draft on product_description_drafts (product_id, lang) where status = 'draft';
create index if not exists product_description_drafts_status_idx on product_description_drafts (status, created_at desc);

-- Admin/automation only: RLS on, no policies — service role only.
alter table seo_health enable row level security;
alter table product_description_drafts enable row level security;

notify pgrst, 'reload schema';
