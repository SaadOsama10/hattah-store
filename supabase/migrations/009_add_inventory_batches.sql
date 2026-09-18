create table if not exists inventory_batches (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  batch_date date not null,
  -- What's actually been paid to the supplier for this batch so far.
  -- Remaining debt (total_cost - amount_paid) is always computed from the
  -- batch's inventory_log rows at read time, never stored.
  amount_paid numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

alter table inventory_log
  add column if not exists batch_id uuid references inventory_batches(id) on delete cascade;

create index if not exists inventory_log_batch_id_idx on inventory_log (batch_id);

alter table inventory_batches enable row level security;
-- Same as inventory_log: admin-only, zero public policies, only the
-- service-role key can touch it.

-- ─────────────────────────────────────────────────────────────
-- Backfill: group the 68 existing rows into the 4 batches they actually
-- came from (matched by item description — entry_date alone can't tell
-- "الفاتورة الأصلية" and "التصحيح اليدوي" apart, since both share
-- 2026-09-14), then mark all four as fully paid (amount_paid = their
-- computed total cost) since none of them carry outstanding debt.
-- ─────────────────────────────────────────────────────────────
do $$
declare
  v_batch1 uuid; -- الفاتورة الأصلية
  v_batch2 uuid; -- التصحيح اليدوي
  v_batch3 uuid; -- فاتورة شركة المها
  v_batch4 uuid; -- الورقة التركية
  v_blazers uuid; -- بلايز (new batch)
begin
  insert into inventory_batches (title, batch_date) values ('الفاتورة الأصلية', '2026-09-14') returning id into v_batch1;
  insert into inventory_batches (title, batch_date) values ('التصحيح اليدوي', '2026-09-14') returning id into v_batch2;
  insert into inventory_batches (title, batch_date) values ('فاتورة شركة المها', '2026-09-09') returning id into v_batch3;
  insert into inventory_batches (title, batch_date) values ('الورقة التركية', '2026-09-17') returning id into v_batch4;

  update inventory_log set batch_id = v_batch1 where item_description in (
    'طقم فناجين قهوة', 'طقم فناجين عربي', 'ثوب أطفال أسود وأحمر',
    'فاصلة كتاب تطريز (معدن)', 'فاصلة كتاب تطريز (بلاستيك)', 'حماية جواز سفر',
    'بزل ١٢٠ قطعة', 'بزل ٢٦٠ قطعة', 'لعبة فارس الأقصى', 'هدية درع الزيتون',
    'خريطة مطرزة مقاس كبير', 'مفتاح مطرز مقاس كبير', 'جزادين مع سنسال كتف',
    'جزدان يد سحاب', 'جزدان يد سحابين', 'جزدان مقاس صغير', 'تيشيرت خفيف',
    'تيشيرت ثقيل', 'مسبحة موديل أول', 'كوفية أورجينال', 'كوفية حمراء أبو عبيدة',
    'علم فلسطين مكتبي', 'خريطة فلسطين خشبية (بني)', 'طقم ٧ أكتوبر مع اللوحة'
  );

  update inventory_log set batch_id = v_batch2 where item_description in (
    'تعليقة حائط خريطة فلسطين', 'شالات فلسطين تطريز (أسود/كحلي/بني)',
    'شالات "فلسطين" مع الخريطة (أسود)', 'سنسال ستانلس فلسطين — ٧ موديلات (مُجمّع)',
    'ميدالية خريطة فلسطين + حنظلة', 'ميدالية خريطة فلسطين بألوان العلم',
    'ميدالية خريطة فلسطين + رسمة الكوفية', 'ميدالية خريطة فلسطين + قبة الصخرة مفتوحة',
    'ميدالية خريطة فلسطين + مفتاح العودة', 'ميدالية بيضاوية', 'ميدالية تطريز يدوي',
    'روزيت متنوع — ١٢ تصميم (مُجمّع)', 'دبوس ثلاثي كبير — قلب أحمر',
    'دبوس ثلاثي كبير — قلب أبيض', 'دبوس ثلاثي كبير — قلب أخضر',
    'ستيكر متنوع — ٢٠ تصميم (مُجمّع)', 'ستيكر جوال خريطة فلسطين ذهبي',
    'ستيكر جوال خريطة فلسطين فضي', 'ثوب تطريز أبيض وأزرق (إضافة يدوية)'
  );

  update inventory_log set batch_id = v_batch3 where item_description in (
    'جبنة كرافت شيدر كرتون ٢٤×٢٥٠غ', 'جبنة بوراك بولار ٥٠٠غ', 'رز الريف أزرق ٩٠٠غ ×١٠',
    'دبس رمان بورجو ١ لتر', 'ماجي مكعب أصلي ×٢٤', 'طحينة موريسة ابن عم ٧٠٠غ ×٦',
    'دبس بندورة تات ٨٥٠غ (طرد)', 'شاي الروحة ١٠٠ ظرف ×٢٤', 'معالق بلاستيك',
    'كتشب بورجو ٦٠٠مل حلوة', 'جبنة كرامل كينت', 'جبنة مسرة تركية مطربان ٢كغ',
    'كياس شيبان', 'سمنة شيبا ٢لتر', 'حمص حب نعمة ٩٠٠غ ×١٠', 'شيبس ساناتي ماكس ×٦٠',
    'قصدير سلفان مطبخ', 'عصير أطفال بكمي طعمات (هدية)'
  );

  update inventory_log set batch_id = v_batch4 where item_description in (
    'STAND — حامل عرض', 'HANZALA — حنظلة', 'DAMLALI FELİSTİN — فلسطين بقطرة إيبوكسي',
    'SARKIMLI FELİSTİN — فلسطين معلّق', 'MERMİ — مفتاح شكل رصاصة',
    'ESKİTME DAMLALI — تصميم قديم بقطرة إيبوكسي', 'UV BASKI — طباعة UV'
  );

  update inventory_batches b set amount_paid = coalesce((
    select sum(quantity * unit_cost) from inventory_log where batch_id = b.id
  ), 0)
  where b.id in (v_batch1, v_batch2, v_batch3, v_batch4);

  -- New batch: "بلايز" — partially paid (14,000 of 33,420).
  insert into inventory_batches (title, batch_date, amount_paid)
  values ('بلايز', current_date, 14000)
  returning id into v_blazers;

  insert into inventory_log (batch_id, entry_date, item_description, quantity, unit_cost, status, quantity_sold)
  values
    (v_blazers, current_date, 'تيشيرتات منتخب فلسطين - أسود', 20, 300, 'in_stock', 0),
    (v_blazers, current_date, 'تيشيرتات منتخب فلسطين - أبيض', 20, 300, 'in_stock', 0),
    (v_blazers, current_date, 'تيشيرتات أطفال فلسطين (مقاسات 6-7 / 8-9 / 10-11 مجمّعة)', 60, 300, 'in_stock', 0),
    (v_blazers, current_date, 'هوديز وتيشيرتات فلسطين عادية', 9, 380, 'in_stock', 0);
end $$;

-- Every row belongs to a batch from now on.
alter table inventory_log alter column batch_id set not null;

NOTIFY pgrst, 'reload schema';
