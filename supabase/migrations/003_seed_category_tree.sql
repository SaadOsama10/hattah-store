-- Seeds the full two-level category tree (5 top-level categories with
-- their subcategories) approved for launch. Run this once in the Supabase
-- SQL editor (Project -> SQL Editor -> New query) against your existing
-- project — supabase/schema.sql already includes this tree for anyone
-- setting up a brand-new project from scratch.
--
-- Safe to re-run: existing rows are relabeled/reordered in place via
-- ON CONFLICT DO UPDATE rather than duplicated.

-- ─────────────────────────────────────────────────────────────
-- Top-level categories — relabel the four that already exist to their
-- final wording, and add the new "Unique Hand Embroidery" category.
-- ─────────────────────────────────────────────────────────────
insert into categories (key, label_ar, label_en, label_tr, sort_order, parent_key) values
  ('clothing', 'الملابس', 'Clothing', 'Giyim', 1, null),
  ('accessories', 'إكسسوارات', 'Accessories', 'Aksesuarlar', 7, null),
  ('decor', 'المنزل والديكور', 'Home & Decorations', 'Ev ve Dekorasyon', 12, null),
  ('premium-embroidery', 'تطريز يدوي مميز', 'Unique Hand Embroidery', 'Özel El Nakışı', 18, null),
  ('games', 'ألعاب', 'Games', 'Oyunlar', 20, null)
on conflict (key) do update set
  label_ar = excluded.label_ar,
  label_en = excluded.label_en,
  label_tr = excluded.label_tr,
  sort_order = excluded.sort_order,
  parent_key = excluded.parent_key;

-- ─────────────────────────────────────────────────────────────
-- Subcategories
-- ─────────────────────────────────────────────────────────────
insert into categories (key, label_ar, label_en, label_tr, sort_order, parent_key) values
  -- Clothing
  ('dresses-abayas', 'الأثواب والعبايات', 'Dresses & Abayas', 'Elbiseler ve Abayalar', 2, 'clothing'),
  ('palestine-tshirts', 'تيشيرت فلسطين', 'Palestine T-Shirts', 'Filistin Tişört', 3, 'clothing'),
  ('hijabs-shawls-foulards', 'الحجاب والشال والفولار', 'Hijabs, Shawls & Foulards', 'Başörtüsü, Şal ve Fular', 4, 'clothing'),
  ('keffiyehs-knitted-shawls', 'الكوفيات واللفحات', 'Keffiyehs & Knitted Shawls', 'Kefiye ve Örgü Şallar', 5, 'clothing'),
  ('shoulder-shawls', 'شال الأكتاف', 'Shoulder Shawls', 'Omuz Şalları', 6, 'clothing'),

  -- Accessories
  ('necklaces-bracelets', 'السلاسل والأساور', 'Necklaces & Bracelets', 'Kolyeler ve Bilezikler', 8, 'accessories'),
  ('bookmarks-bags-wallets', 'فواصل الكتب والحقائب والمحافظ', 'Bookmarks, Bags & Wallets', 'Kitap Ayraçları, Çantalar ve Cüzdanlar', 9, 'accessories'),
  ('brooches-keychains', 'البروشات والميداليات', 'Brooches & Keychains', 'Broşlar ve Anahtarlıklar', 10, 'accessories'),
  ('stickers', 'الملصقات', 'Stickers', 'Çıkartmalar', 11, 'accessories'),

  -- Home & Decorations
  ('wall-decorations', 'ديكورات الحائط', 'Wall Decorations', 'Duvar Dekorasyonları', 13, 'decor'),
  ('flags', 'الأعلام', 'Flags', 'Bayraklar', 14, 'decor'),
  ('figurines', 'المجسمات', 'Figurines', 'Figürler', 15, 'decor'),
  ('heritage-rooms', 'غرف التراث', 'Heritage Rooms', 'Miras Odaları', 16, 'decor'),
  ('coffee-tea', 'القهوة والشاي', 'Coffee & Tea', 'Kahve ve Çay', 17, 'decor'),

  -- Unique Hand Embroidery
  ('unique-hand-embroidery', 'تطريز يدوي فريد', 'Unique Hand Embroidery', 'Özel El İşlemesi', 19, 'premium-embroidery'),

  -- Games
  ('brain-games', 'ألعاب ذكاء', 'Intelligence Games', 'Zeka Oyunları', 21, 'games')
on conflict (key) do update set
  label_ar = excluded.label_ar,
  label_en = excluded.label_en,
  label_tr = excluded.label_tr,
  sort_order = excluded.sort_order,
  parent_key = excluded.parent_key;
