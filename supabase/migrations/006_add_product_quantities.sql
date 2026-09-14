-- Adds a third opt-in product variant: quantity options, each with its
-- own price (e.g. "250g" = 150, "500g" = 280, "1kg" = 500). Run this once
-- in the Supabase SQL editor — supabase/schema.sql already includes this
-- for anyone setting up a brand-new project from scratch.
--
-- has_quantities defaults to false, so every existing product keeps
-- selling at its plain base price with zero extra steps for the buyer.

alter table products
  add column if not exists has_quantities boolean not null default false;

create table if not exists product_quantities (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label_ar text not null,
  label_en text not null,
  label_tr text not null,
  price numeric(10, 2) not null,
  sort_order int not null default 0
);

create index if not exists product_quantities_product_id_idx on product_quantities (product_id);

alter table product_quantities enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'product_quantities' and policyname = 'Public can read product_quantities'
  ) then
    create policy "Public can read product_quantities"
      on product_quantities for select
      using (true);
  end if;
end $$;

NOTIFY pgrst, 'reload schema';
