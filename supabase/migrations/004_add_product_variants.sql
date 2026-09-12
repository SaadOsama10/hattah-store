-- Adds opt-in product variants (sizes / colors). Run this once in the
-- Supabase SQL editor (Project -> SQL Editor -> New query) against your
-- existing project — supabase/schema.sql already includes all of this for
-- anyone setting up a brand-new project from scratch.
--
-- has_sizes / has_colors default to false, so every existing product keeps
-- working exactly as before with no variant picker and no extra step for
-- the buyer.

alter table products
  add column if not exists has_sizes boolean not null default false,
  add column if not exists has_colors boolean not null default false;

create table if not exists product_sizes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null,
  sort_order int not null default 0
);

create index if not exists product_sizes_product_id_idx on product_sizes (product_id);

create table if not exists product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null,
  sort_order int not null default 0
);

create index if not exists product_colors_product_id_idx on product_colors (product_id);

alter table product_sizes enable row level security;
alter table product_colors enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'product_sizes' and policyname = 'Public can read product_sizes'
  ) then
    create policy "Public can read product_sizes"
      on product_sizes for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'product_colors' and policyname = 'Public can read product_colors'
  ) then
    create policy "Public can read product_colors"
      on product_colors for select
      using (true);
  end if;
end $$;
