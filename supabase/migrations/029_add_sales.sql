-- Order-level sales log (TRY). A sale with several items at one price is ONE
-- order with ONE total; items carry no per-item price.
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null default current_date,
  total_try numeric(12, 2) not null check (total_try >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  item_name text not null,
  product_id uuid references products(id) on delete set null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists sales_sale_date_idx on sales (sale_date desc);
create index if not exists sale_items_sale_idx on sale_items (sale_id);

-- Admin-only (service role): RLS on, no policies.
alter table sales enable row level security;
alter table sale_items enable row level security;

NOTIFY pgrst, 'reload schema';
