-- Reliable trigger for the social pipeline (run once in the Supabase SQL editor).
-- Every 5 minutes pg_cron calls the secured Vercel route, which wakes the GitHub workflows
-- only when posts are due / tomorrow is missing. Replace __CRON_SECRET__ with the value of the
-- CRON_SECRET env var in Vercel (never commit the real value).
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'hattah-social-tick';

select cron.schedule(
  'hattah-social-tick',
  '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://hattah-store.vercel.app/api/social/cron',
       headers := jsonb_build_object('Authorization', 'Bearer __CRON_SECRET__', 'Content-Type', 'application/json'),
       body := '{}'::jsonb,
       timeout_milliseconds := 20000
     ) $$
);
