alter table categories
  add column if not exists description_ar text,
  add column if not exists description_en text,
  add column if not exists description_tr text,
  add column if not exists icon_key text not null default 'gift';

update categories set description_ar = 'تطريز فلسطيني أصيل بلمسة عصرية', description_en = 'Authentic Palestinian embroidery, modern touch', description_tr = 'Otantik Filistin nakışı, modern dokunuş', icon_key = 'shirt' where key = 'clothing';
update categories set description_ar = 'مجوهرات وإكسسوارات تحمل هوية', description_en = 'Jewelry and accessories that carry identity', description_tr = 'Kimlik taşıyan takı ve aksesuarlar', icon_key = 'gem' where key = 'accessories';
update categories set description_ar = 'لمسات تراثية لبيتك', description_en = 'Heritage touches for your home', description_tr = 'Eviniz için miras dokunuşları', icon_key = 'lamp' where key = 'decor';
update categories set description_ar = 'هدايا تروي حكاية فلسطين', description_en = 'Gifts that tell Palestine''s story', description_tr = 'Filistin''in hikayesini anlatan hediyeler', icon_key = 'gift' where key = 'games';
update categories set description_ar = 'نكهات فلسطين الأصيلة بين يديك', description_en = 'Authentic Palestinian flavors, delivered', description_tr = 'Otantik Filistin lezzetleri elinizin altında', icon_key = 'utensils' where key = 'palestinian-food';

NOTIFY pgrst, 'reload schema';
