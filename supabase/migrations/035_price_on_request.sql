-- Products without a public price ("price on request"): ordered via WhatsApp only.
-- price stays NOT NULL (stored as 0 for these rows); the flag is what the app reads.
alter table products add column if not exists price_on_request boolean not null default false;

NOTIFY pgrst, 'reload schema';
