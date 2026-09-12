-- Adds manual "featured on homepage" control to products.
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- against your existing project — supabase/schema.sql already includes this
-- column for anyone setting up a brand-new project from scratch.

alter table products
  add column if not exists is_featured boolean not null default false;

create index if not exists products_is_featured_idx on products (is_featured);
