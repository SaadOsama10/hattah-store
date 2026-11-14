-- Add the "low" focus level (0.5): social_weight becomes numeric(3,1); allowed 0, 0.5, 1, 2, 4. Existing values unchanged.
alter table social_product_settings alter column social_weight drop default;
alter table social_product_settings drop constraint if exists social_product_settings_weight_chk;
alter table social_product_settings alter column social_weight type numeric(3, 1) using social_weight::numeric;
alter table social_product_settings alter column social_weight set default 1;
alter table social_product_settings
  add constraint social_product_settings_weight_chk check (social_weight in (0, 0.5, 1, 2, 4));

notify pgrst, 'reload schema';
