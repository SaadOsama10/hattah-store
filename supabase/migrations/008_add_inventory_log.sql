create table if not exists inventory_log (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  item_description text not null,
  quantity int not null,
  unit_cost numeric(10, 2) not null default 0,
  status text not null default 'in_stock' check (status in ('in_stock', 'sold_out', 'partially_sold')),
  quantity_sold int not null default 0,
  unit_sale_price numeric(10, 2),
  last_sale_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_log_entry_date_idx on inventory_log (entry_date desc);

alter table inventory_log enable row level security;
-- Admin-only table: intentionally has RLS enabled with NO select/write
-- policy at all — only the service-role key (bypasses RLS, used
-- server-side from admin-session-gated code) can read or write this
-- table; the public anon key gets zero access, unlike every other table
-- in this schema, since this is internal financial data, not storefront
-- content.

NOTIFY pgrst, 'reload schema';
