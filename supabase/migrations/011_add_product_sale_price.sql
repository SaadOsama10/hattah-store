-- Optional sale price for plain (non-quantity) products. NULL keeps a
-- product working exactly as before (single regular price). When set and
-- lower than price, the product is "on sale": price becomes the
-- struck-through original and sale_price the price actually charged
-- everywhere (cards, product page, cart, WhatsApp messages).
alter table products
  add column if not exists sale_price numeric(10, 2);

NOTIFY pgrst, 'reload schema';
