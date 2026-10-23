-- Single source for the store address printed on post images (change it here / in
-- /admin/social/settings when a custom domain is bought). Captions never carry links.
alter table social_settings
  add column if not exists store_url text not null default 'hattah-store.vercel.app';

notify pgrst, 'reload schema';
