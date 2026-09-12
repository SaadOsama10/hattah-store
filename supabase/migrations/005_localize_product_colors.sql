-- Splits product_colors.label into label_ar / label_en / label_tr, matching
-- how every other user-facing text in the schema (product name,
-- description, category label) is already stored per-language. Run this
-- once in the Supabase SQL editor — supabase/schema.sql already includes
-- the new shape for anyone setting up a brand-new project from scratch.
--
-- product_sizes is untouched — sizes (S/M/L/XL) read the same in every
-- language, so a single label column stays correct there.
--
-- Safe to re-run: existing rows are backfilled (old single label copied
-- into all three language columns as a starting point) rather than lost,
-- and the steps are idempotent.

alter table product_colors
  add column if not exists label_ar text,
  add column if not exists label_en text,
  add column if not exists label_tr text;

update product_colors
set
  label_ar = coalesce(label_ar, label),
  label_en = coalesce(label_en, label),
  label_tr = coalesce(label_tr, label)
where label_ar is null or label_en is null or label_tr is null;

alter table product_colors
  alter column label_ar set not null,
  alter column label_en set not null,
  alter column label_tr set not null;

alter table product_colors drop column if exists label;

NOTIFY pgrst, 'reload schema';
