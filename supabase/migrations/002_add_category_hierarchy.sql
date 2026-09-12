-- Adds two-level category hierarchy support (parent category -> optional
-- subcategories). Run this once in the Supabase SQL editor (Project -> SQL
-- Editor -> New query) against your existing project — supabase/schema.sql
-- already includes this column for anyone setting up a brand-new project
-- from scratch.

alter table categories
  add column if not exists parent_key text references categories(key);

create index if not exists categories_parent_key_idx on categories (parent_key);
