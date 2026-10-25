-- Carousel posts (3–5 slides), the Instagram location tag, and the slots/Turkish settings (applied with the carousel code, see 026).
alter table social_posts drop constraint if exists social_posts_post_type_check;
alter table social_posts add constraint social_posts_post_type_check check (post_type in ('feed', 'story', 'reel', 'carousel'));
alter table social_posts add column if not exists slides jsonb;
alter table social_settings add column if not exists location_id text;
notify pgrst, 'reload schema';
