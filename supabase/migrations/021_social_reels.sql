-- Reels + the fixed daily schedule from 26/10: 6 feed posts + 2 reels + 8 stories (16 items), 09:00-23:59 Istanbul.
alter table social_posts drop constraint if exists social_posts_post_type_check;
alter table social_posts add constraint social_posts_post_type_check check (post_type in ('feed', 'story', 'reel'));

-- Rendered MP4 of a reel (public URL in the social-posts bucket); removed right after publishing.
alter table social_posts add column if not exists video_url text;

-- Private bucket for the licensed music excerpts (service role only; see automation/music/LICENSES.md).
insert into storage.buckets (id, name, public) values ('social-music', 'social-music', false) on conflict (id) do nothing;

alter table social_settings alter column daily_slots set default '[{"type":"feed","time":"09:15"},{"type":"story","time":"10:15"},{"type":"feed","time":"11:15"},{"type":"story","time":"12:00"},{"type":"reel","time":"13:00"},{"type":"story","time":"13:50"},{"type":"feed","time":"14:45"},{"type":"story","time":"15:35"},{"type":"feed","time":"16:30"},{"type":"story","time":"17:20"},{"type":"feed","time":"18:15"},{"type":"story","time":"19:05"},{"type":"reel","time":"20:00"},{"type":"story","time":"21:15"},{"type":"feed","time":"22:00"},{"type":"story","time":"23:30"}]'::jsonb;
update social_settings set daily_slots = '[{"type":"feed","time":"09:15"},{"type":"story","time":"10:15"},{"type":"feed","time":"11:15"},{"type":"story","time":"12:00"},{"type":"reel","time":"13:00"},{"type":"story","time":"13:50"},{"type":"feed","time":"14:45"},{"type":"story","time":"15:35"},{"type":"feed","time":"16:30"},{"type":"story","time":"17:20"},{"type":"feed","time":"18:15"},{"type":"story","time":"19:05"},{"type":"reel","time":"20:00"},{"type":"story","time":"21:15"},{"type":"feed","time":"22:00"},{"type":"story","time":"23:30"}]'::jsonb where id = 1;

notify pgrst, 'reload schema';
