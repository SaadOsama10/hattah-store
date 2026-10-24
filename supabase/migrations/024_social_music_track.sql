-- Which music track a reel uses, so no two reels within 3 days share one (see automation/src/music.ts chooseTrack).
alter table social_posts add column if not exists music_track text;
notify pgrst, 'reload schema';
