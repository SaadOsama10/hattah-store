-- Per-product social focus weight (kept with the other per-product social options).
-- 0 = excluded from auto-posting, 1 = normal (default; a missing row also means 1),
-- 2 = high focus, 4 = very high focus.
alter table social_product_settings
  add column if not exists social_weight smallint not null default 1;
alter table social_product_settings drop constraint if exists social_product_settings_weight_chk;
alter table social_product_settings
  add constraint social_product_settings_weight_chk check (social_weight in (0, 1, 2, 4));

notify pgrst, 'reload schema';
