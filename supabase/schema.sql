-- HATTAH e-commerce schema
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).

-- ─────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Categories
-- ─────────────────────────────────────────────────────────────
create table if not exists categories (
  key text primary key,
  label_ar text not null,
  label_en text not null,
  label_tr text not null,
  sort_order int not null default 0,
  -- Self-referencing: NULL for a top-level category, otherwise the key of
  -- its parent. Only two levels are supported (a subcategory can never be a
  -- parent itself) — that constraint is enforced in application code, not
  -- here, since a simple FK can't express "depth <= 2".
  parent_key text references categories(key),
  -- Short (<=60 char) homepage tile description, admin-editable, one per
  -- language. NULL until an admin sets it — the storefront falls back to a
  -- generic translated line rather than rendering blank.
  description_ar text,
  description_en text,
  description_tr text,
  -- Key into the fixed lucide-react icon set used for the homepage tile
  -- (see src/lib/categoryIcons.ts) — never a free-form icon/image upload.
  icon_key text not null default 'gift'
);

create index if not exists categories_parent_key_idx on categories (parent_key);

insert into categories (key, label_ar, label_en, label_tr, sort_order, parent_key) values
  -- Top-level categories
  ('clothing', 'الملابس', 'Clothing', 'Giyim', 1, null),
  ('accessories', 'إكسسوارات', 'Accessories', 'Aksesuarlar', 7, null),
  ('decor', 'المنزل والديكور', 'Home & Decorations', 'Ev ve Dekorasyon', 12, null),
  ('premium-embroidery', 'تطريز يدوي مميز', 'Unique Hand Embroidery', 'Özel El Nakışı', 18, null),
  ('games', 'ألعاب', 'Games', 'Oyunlar', 20, null),

  -- Clothing subcategories
  ('dresses-abayas', 'الأثواب والعبايات', 'Dresses & Abayas', 'Elbiseler ve Abayalar', 2, 'clothing'),
  ('palestine-tshirts', 'تيشيرت فلسطين', 'Palestine T-Shirts', 'Filistin Tişört', 3, 'clothing'),
  ('hijabs-shawls-foulards', 'الحجاب والشال والفولار', 'Hijabs, Shawls & Foulards', 'Başörtüsü, Şal ve Fular', 4, 'clothing'),
  ('keffiyehs-knitted-shawls', 'الكوفيات واللفحات', 'Keffiyehs & Knitted Shawls', 'Kefiye ve Örgü Şallar', 5, 'clothing'),
  ('shoulder-shawls', 'شال الأكتاف', 'Shoulder Shawls', 'Omuz Şalları', 6, 'clothing'),

  -- Accessories subcategories
  ('necklaces-bracelets', 'السلاسل والأساور', 'Necklaces & Bracelets', 'Kolyeler ve Bilezikler', 8, 'accessories'),
  ('bookmarks-bags-wallets', 'فواصل الكتب والحقائب والمحافظ', 'Bookmarks, Bags & Wallets', 'Kitap Ayraçları, Çantalar ve Cüzdanlar', 9, 'accessories'),
  ('brooches-keychains', 'البروشات والميداليات', 'Brooches & Keychains', 'Broşlar ve Anahtarlıklar', 10, 'accessories'),
  ('stickers', 'الملصقات', 'Stickers', 'Çıkartmalar', 11, 'accessories'),

  -- Home & Decorations subcategories
  ('wall-decorations', 'ديكورات الحائط', 'Wall Decorations', 'Duvar Dekorasyonları', 13, 'decor'),
  ('flags', 'الأعلام', 'Flags', 'Bayraklar', 14, 'decor'),
  ('figurines', 'المجسمات', 'Figurines', 'Figürler', 15, 'decor'),
  ('heritage-rooms', 'غرف التراث', 'Heritage Rooms', 'Miras Odaları', 16, 'decor'),
  ('coffee-tea', 'القهوة والشاي', 'Coffee & Tea', 'Kahve ve Çay', 17, 'decor'),

  -- Unique Hand Embroidery subcategory
  ('unique-hand-embroidery', 'تطريز يدوي فريد', 'Unique Hand Embroidery', 'Özel El İşlemesi', 19, 'premium-embroidery'),

  -- Games subcategory
  ('brain-games', 'ألعاب ذكاء', 'Intelligence Games', 'Zeka Oyunları', 21, 'games')
on conflict (key) do nothing;

-- Default descriptions/icons for the storefront's top-level category tiles
-- (a fresh install has no admin-entered values yet, so seed sensible ones).
update categories set description_ar = 'تطريز فلسطيني أصيل بلمسة عصرية', description_en = 'Authentic Palestinian embroidery, modern touch', description_tr = 'Otantik Filistin nakışı, modern dokunuş', icon_key = 'shirt' where key = 'clothing';
update categories set description_ar = 'مجوهرات وإكسسوارات تحمل هوية', description_en = 'Jewelry and accessories that carry identity', description_tr = 'Kimlik taşıyan takı ve aksesuarlar', icon_key = 'gem' where key = 'accessories';
update categories set description_ar = 'لمسات تراثية لبيتك', description_en = 'Heritage touches for your home', description_tr = 'Eviniz için miras dokunuşları', icon_key = 'lamp' where key = 'decor';
update categories set description_ar = 'هدايا تروي حكاية فلسطين', description_en = 'Gifts that tell Palestine''s story', description_tr = 'Filistin''in hikayesini anlatan hediyeler', icon_key = 'gift' where key = 'games';
update categories set description_ar = 'نكهات فلسطين الأصيلة بين يديك', description_en = 'Authentic Palestinian flavors, delivered', description_tr = 'Otantik Filistin lezzetleri elinizin altında', icon_key = 'utensils' where key = 'palestinian-food';

-- ─────────────────────────────────────────────────────────────
-- Products
-- ─────────────────────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  name_tr text not null,
  description_ar text not null default '',
  description_en text not null default '',
  description_tr text not null default '',
  price numeric(10, 2) not null default 0,
  -- Optional sale price for plain (non-quantity) products. NULL keeps a
  -- product working exactly as before. When set and lower than price,
  -- price becomes the struck-through original and sale_price the price
  -- actually charged everywhere (cards, product page, cart, WhatsApp).
  sale_price numeric(10, 2),
  category text not null references categories(key),
  is_featured boolean not null default false,
  -- Product variants (sizes/colors/quantities) are opt-in per product —
  -- all default to false so every existing product keeps working with
  -- zero extra steps for the buyer.
  has_sizes boolean not null default false,
  has_colors boolean not null default false,
  has_quantities boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on products (category);
create index if not exists products_created_at_idx on products (created_at desc);
create index if not exists products_is_featured_idx on products (is_featured);

-- ─────────────────────────────────────────────────────────────
-- Product images (ordered, multiple per product)
-- ─────────────────────────────────────────────────────────────
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0
);

create index if not exists product_images_product_id_idx on product_images (product_id);

-- ─────────────────────────────────────────────────────────────
-- Product variants — each row is one selectable size or color option
-- for a product. Only shown/used when the product's has_sizes /
-- has_colors flag is set.
-- ─────────────────────────────────────────────────────────────
create table if not exists product_sizes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null,
  sort_order int not null default 0
);

create index if not exists product_sizes_product_id_idx on product_sizes (product_id);

create table if not exists product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  -- Unlike product_sizes' plain label (S/M/L reads the same in every
  -- language), a color name is real text — "Black"/"أسود"/"Siyah" — so it
  -- needs the same per-language columns as the product's own name.
  label_ar text not null,
  label_en text not null,
  label_tr text not null,
  sort_order int not null default 0
);

create index if not exists product_colors_product_id_idx on product_colors (product_id);

-- Quantity options (e.g. "250g" / "500g" / "1kg") — unlike sizes and
-- colors, each option carries its own price, since that's the whole
-- point of the feature: the buyer pays what that specific option costs,
-- not the product's base price.
create table if not exists product_quantities (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label_ar text not null,
  label_en text not null,
  label_tr text not null,
  price numeric(10, 2) not null,
  sort_order int not null default 0
);

create index if not exists product_quantities_product_id_idx on product_quantities (product_id);

-- ─────────────────────────────────────────────────────────────
-- Inventory log — an internal purchase/sale ledger for the admin's own
-- bookkeeping ("دفتر البضاعة"). Deliberately independent of `products`:
-- a free-text description, not a product reference, since a batch of
-- stock doesn't always map one-to-one to a storefront listing. Never
-- read by the storefront.
--
-- Every line item belongs to one inventory_batches row — one purchase
-- occasion (an invoice, a supplier visit) that may contain many line
-- items. A batch's total cost and remaining debt are always computed
-- from its line items and amount_paid at read time, never stored.
-- ─────────────────────────────────────────────────────────────
create table if not exists inventory_batches (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  batch_date date not null,
  amount_paid numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists inventory_log (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references inventory_batches(id) on delete cascade,
  entry_date date not null default current_date,
  item_description text not null,
  quantity int not null,
  unit_cost numeric(10, 2) not null default 0,
  -- Reference-only original-currency price, for line items bought in a
  -- foreign currency (e.g. Egyptian pounds). unit_cost above (in TL) is
  -- always what every total/profit/debt calculation actually uses — these
  -- two columns are just shown alongside it, never computed from. Both
  -- null together, or both set together.
  original_currency text,
  original_unit_cost numeric(10, 2),
  status text not null default 'in_stock' check (status in ('in_stock', 'sold_out', 'partially_sold')),
  quantity_sold int not null default 0,
  unit_sale_price numeric(10, 2),
  last_sale_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists inventory_log_entry_date_idx on inventory_log (entry_date desc);
create index if not exists inventory_log_batch_id_idx on inventory_log (batch_id);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security — public can only ever read.
-- All writes go through server actions using the service-role key,
-- which bypasses RLS entirely, so no write policies are defined here.
-- ─────────────────────────────────────────────────────────────
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_sizes enable row level security;
alter table product_colors enable row level security;
alter table product_quantities enable row level security;

create policy "Public can read categories"
  on categories for select
  using (true);

create policy "Public can read products"
  on products for select
  using (true);

create policy "Public can read product_images"
  on product_images for select
  using (true);

create policy "Public can read product_sizes"
  on product_sizes for select
  using (true);

create policy "Public can read product_colors"
  on product_colors for select
  using (true);

create policy "Public can read product_quantities"
  on product_quantities for select
  using (true);

-- inventory_batches / inventory_log deliberately have RLS enabled but NO
-- select/write policy at all — only the service-role key (bypasses RLS)
-- can touch them. The public anon key gets zero access, unlike every
-- other table above.
alter table inventory_batches enable row level security;
alter table inventory_log enable row level security;

-- ─────────────────────────────────────────────────────────────
-- Storage bucket for product photos (public read).
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- No insert/update/delete storage policies for the anon role —
-- uploads happen only via the service-role key in server actions.
