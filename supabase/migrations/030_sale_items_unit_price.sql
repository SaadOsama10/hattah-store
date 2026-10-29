-- Optional per-item unit price. NULL = the sale only has an order-level
-- total (sales.total_try), with no price invented per item.
alter table sale_items add column if not exists unit_price numeric(10, 2) check (unit_price is null or unit_price >= 0);

NOTIFY pgrst, 'reload schema';
