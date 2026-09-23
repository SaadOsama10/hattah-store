-- Reference-only original-currency price per inventory_log line item, for
-- batches bought in a foreign currency (e.g. Egyptian pounds). unit_cost
-- (in TL) stays the value every total/profit/debt calculation actually
-- uses; these two columns are just shown alongside it, never computed
-- from. Both null on every existing row — no backfill needed.
alter table inventory_log
  add column if not exists original_currency text,
  add column if not exists original_unit_cost numeric(10, 2);

-- New batch: "طناجر وحطات (مصر)" — bought in EGP, not yet paid.
do $
declare
  v_batch uuid;
begin
  insert into inventory_batches (title, batch_date, amount_paid)
  values ('طناجر وحطات (مصر)', current_date, 0)
  returning id into v_batch;

  insert into inventory_log (
    batch_id, entry_date, item_description, quantity, unit_cost,
    original_currency, original_unit_cost, status, quantity_sold
  )
  values
    (v_batch, current_date, 'طنجرة مفتول مقاس 36', 5, 940.17, 'EGP', 1000, 'in_stock', 0),
    (v_batch, current_date, 'طنجرة مفتول مقاس 42', 5, 1410.26, 'EGP', 1500, 'in_stock', 0),
    (v_batch, current_date, 'شبكة', 5, 94.02, 'EGP', 100, 'in_stock', 0),
    (v_batch, current_date, 'طناجر كهربا', 10, 1034.19, 'EGP', 1100, 'in_stock', 0),
    (v_batch, current_date, 'حطات (كوفية) - دفعة مجمّعة', 1, 17392.22, 'EGP', 18500, 'in_stock', 0),
    (v_batch, current_date, 'الشحن والتجميع', 1, 14102.61, 'EGP', 15000, 'in_stock', 0);
end $;

NOTIFY pgrst, 'reload schema';
