-- Optional custom name for a product's priced options (e.g. "Size" instead of "Quantity").
-- NULL = the default "Quantity" wording, so existing products are unchanged.
alter table products add column if not exists option_label_ar text;
alter table products add column if not exists option_label_en text;
alter table products add column if not exists option_label_tr text;
NOTIFY pgrst, 'reload schema';
