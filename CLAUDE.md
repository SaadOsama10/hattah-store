# HATTAH (حَطّة) — دليل المشروع

متجر للمنتجات الفلسطينية. Next.js 15 + TypeScript + Tailwind v4 + Supabase + next-intl (عربي RTL / إنجليزي / تركي). النشر على Vercel تلقائيًا مع كل `git push` على `main`.

## البنية
- `src/app/[locale]/(site)/` — واجهة المتجر العامة. `src/app/[locale]/admin/` — لوحة الأدمن (محمية بجلسة، `login` + `(protected)`).
- `src/actions/` — Server Actions (auth, categories, products, inventory). كلها تبدأ بـ `assertAdminSession()`.
- `src/lib/supabase/` — `public.ts` (anon)، `service.ts` (service role، سيرفر فقط)، `types.ts`.
- `src/lib/inventory-period.ts` — حساب فلتر الفترة الزمنية (بالسنتات كأعداد صحيحة).
- `messages/{ar,en,tr}.json` — الترجمات. واجهة الأدمن عربية فقط (نصوص مباشرة).
- `supabase/migrations/NNN_*.sql` — الـ migrations مرقّمة (آخر واحد 012). `supabase/schema.sql` المخطط الكامل.
- الأسرار في `.env.local` (لا تُطبع ولا تُرفع): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`.

## دفتر البضاعة (`/admin/inventory`)
جداول مفعّل عليها RLS بدون أي policy (service role فقط).
- `inventory_batches`: `id, title, batch_date, amount_paid, notes, created_at`. الدين = تكلفة الدفعة − `amount_paid` (يُحسب ولا يُخزَّن).
- `inventory_log`: `id, batch_id, entry_date, item_description, quantity, unit_cost, original_currency, original_unit_cost, status, quantity_sold, unit_sale_price, last_sale_date, notes, created_at`.
- `status` ∈ `in_stock` | `partially_sold` | `sold_out`.
- التكلفة = `quantity × unit_cost`، الإيراد = `quantity_sold × unit_sale_price`، الربح القديم = الإيراد − `quantity_sold × unit_cost`.
- فلتر الفترة (`?from=YYYY-MM-DD&to=YYYY-MM-DD`) يفلتر الدفعات حسب `batch_date`؛ بدون بارامترات الصفحة كما كانت.

## دفعات الإيرادات التوثيقية
دفعة تكلفتها 0 و`amount_paid = 0` وفيها صفوف بيع فقط (مثال: «إيرادات معرض الكيا»، «إيرادات مبيعات 16-10-2026»). كل صف: `quantity = quantity_sold`، `unit_cost = 0`، `status = 'sold_out'`، `unit_sale_price` = سعر الوحدة، `entry_date = last_sale_date = batch_date`، واسم الزبون/الطلبية في `notes`. ملاحظة الدفعة تذكر أنها غير مربوطة بصف مخزون محدد. دفعات المشتريات: `status = 'in_stock'`، `quantity_sold = 0`، و`amount_paid` = المدفوع فعليًا.

## قواعد العمل
- شغّل الـ migration على Supabase (SQL Editor) **قبل** أي `git push` يعتمد عليه. بعد أي migration بجداول/أعمدة جديدة أضف في آخره `NOTIFY pgrst, 'reload schema';`. لا تفترض أنه اتطبق.
- تعديلات **البيانات** (إدخال دفعات/صفوف) لا تحتاج `git push`. تعديلات **الكود** تحتاج commit + push، ثم التأكد من Vercel (Deployments → Ready).
- لا تعدّل ولا تحذف بيانات موجودة بدون طلب صريح. قبل أي إدخال: افحص عدم وجود تكرار، وطابق المجاميع قبل/بعد.
- قبل الـ push: `npm run build` بدون أخطاء TypeScript.
