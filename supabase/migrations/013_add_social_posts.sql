-- Social media automation (Instagram + Facebook). See /automation.
-- Admin/automation only: RLS on, no policies — the service-role key only.

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  post_type text not null check (post_type in ('feed', 'story')),
  angle text not null check (angle in ('showcase', 'heritage', 'quote', 'offer')),
  image_url text,
  caption_full text,
  -- Short copy printed on the image (quote / heritage line), written by the
  -- model together with the caption.
  design jsonb,
  scheduled_at timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'publishing', 'published', 'failed', 'skipped')),
  ig_media_id text,
  fb_post_id text,
  ig_permalink text,
  error text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  locked_at timestamptz
);

create index if not exists social_posts_status_scheduled_idx on social_posts (status, scheduled_at);
create index if not exists social_posts_product_idx on social_posts (product_id, scheduled_at desc);

create table if not exists social_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  auto_approve boolean not null default false,
  daily_slots jsonb not null default '[
    {"type":"feed","time":"12:30"},
    {"type":"feed","time":"19:30"},
    {"type":"story","time":"21:30"}
  ]'::jsonb,
  caption_languages text[] not null default array['ar','en'],
  hashtags_base text[] not null default array['#حطة','#فلسطين','#تراث_فلسطيني','#تطريز_فلسطيني','#Palestine','#Hattah'],
  excluded_product_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into social_settings (id) values (1) on conflict (id) do nothing;

alter table social_posts enable row level security;
alter table social_settings enable row level security;

-- Public bucket: Instagram must fetch the JPEG from a public URL.
insert into storage.buckets (id, name, public)
values ('social-posts', 'social-posts', true)
on conflict (id) do nothing;

create policy "Public can view social posts"
  on storage.objects for select
  using (bucket_id = 'social-posts');

notify pgrst, 'reload schema';
