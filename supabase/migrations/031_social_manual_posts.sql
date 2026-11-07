-- Manual posts (/admin/social/new): a post for any product at any time, built through the same render pipeline.
--  • status 'composing' = being prepared in the wizard (never publishable, ignored by rotation/music rules)
--  • is_manual / manual_params = what the owner chose (photos in order, text mode, music track)
--  • render_state = progress of the GitHub Actions render shown in the wizard

alter table social_posts drop constraint if exists social_posts_status_check;
alter table social_posts add constraint social_posts_status_check
  check (status in ('composing', 'draft', 'approved', 'publishing', 'published', 'failed', 'skipped'));

alter table social_posts
  add column if not exists is_manual boolean not null default false,
  add column if not exists manual_params jsonb,
  add column if not exists render_state text check (render_state in ('queued', 'running', 'ready', 'failed')),
  add column if not exists render_error text,
  add column if not exists render_updated_at timestamptz;

notify pgrst, 'reload schema';
