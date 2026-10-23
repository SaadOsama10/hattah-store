-- Per-product social options (kept out of `products` so the storefront table
-- is untouched). remove_bg: cut the product out of its photo and place it on
-- the brand background in generated posts.
-- Admin/automation only: RLS on, no policies — the service-role key only.

create table if not exists social_product_settings (
  product_id uuid primary key references products(id) on delete cascade,
  remove_bg boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table social_product_settings enable row level security;

notify pgrst, 'reload schema';
