-- Direct Facebook API publishing is off by default: Instagram auto-shares to the Page instead.
alter table social_settings
  add column if not exists publish_to_facebook boolean not null default false;

notify pgrst, 'reload schema';
