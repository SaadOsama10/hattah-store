# HATTAH (حَطّة) — دليل المشروع

متجر للمنتجات الفلسطينية. Next.js 15 + TypeScript + Tailwind v4 + Supabase + next-intl (عربي RTL / إنجليزي / تركي). النشر على Vercel تلقائيًا مع كل `git push` على `main`.

## البنية
- `src/app/[locale]/(site)/` — واجهة المتجر العامة. `src/app/[locale]/admin/` — لوحة الأدمن (محمية بجلسة، `login` + `(protected)`).
- `src/actions/` — Server Actions (auth, categories, products, inventory). كلها تبدأ بـ `assertAdminSession()`.
- `src/lib/supabase/` — `public.ts` (anon)، `service.ts` (service role، سيرفر فقط)، `types.ts`.
- `src/lib/inventory-period.ts` — حساب فلتر الفترة الزمنية (بالسنتات كأعداد صحيحة).
- `messages/{ar,en,tr}.json` — الترجمات. واجهة الأدمن عربية فقط (نصوص مباشرة).
- `supabase/migrations/NNN_*.sql` — الـ migrations مرقّمة (آخر واحد 022). `supabase/schema.sql` المخطط الكامل.
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
- **نفّذ كل شيء بنفسك**: الـ migrations (Supabase SQL Editor عبر Chrome المسجّل دخوله، الصق SQL بـ `monaco.editor.getEditors()[0].setValue(...)` ثم cmd+Enter)، النشر، التوليد (`gh workflow run social-generate.yml -f mode=today -f extra_args="--date=… --only=story@HH:MM --jitter=0"`)، وأي خطوة إعداد. لا تطلب من المستخدم نسخًا/لصقًا/نقرًا إلا إذا احتاجت الخطوة كلمة مرور أو رمز تحقق.
- شغّل الـ migration على Supabase (SQL Editor) **قبل** أي `git push` يعتمد عليه. بعد أي migration بجداول/أعمدة جديدة أضف في آخره `NOTIFY pgrst, 'reload schema';`. لا تفترض أنه اتطبق.
- تعديلات **البيانات** (إدخال دفعات/صفوف) لا تحتاج `git push`. تعديلات **الكود** تحتاج commit + push، ثم التأكد من Vercel (Deployments → Ready).
- لا تعدّل ولا تحذف بيانات موجودة بدون طلب صريح. قبل أي إدخال: افحص عدم وجود تكرار، وطابق المجاميع قبل/بعد.
- قبل الـ push: `npm run build` بدون أخطاء TypeScript.

## أتمتة السوشيال ميديا (`/automation`)
سكربتات Node/TS (Playwright + OpenAI + Meta Graph API) تعمل عبر GitHub Actions (`social-generate.yml` يوميًا 03:00 إسطنبول، `social-publish.yml` كل ساعة عند :35). جداول `social_posts` و`social_settings` (migration 013، الجدول الزمني في 022: 6 منشورات + 3 ريلز + 8 ستوريات يوميًا) وbucket عام `social-posts`. واجهة الأدمن: `/admin/social` (+`/settings`). الأعمال الثقيلة (توليد/إعادة توليد/نشر الآن) تُطلق من الواجهة عبر `workflow_dispatch` (`GH_DISPATCH_TOKEN`). `DRY_RUN=true` يمنع أي استدعاء لـ Meta. الإعداد: `automation/SETUP_AR.md`.

### الريلز (من 26/10)
- `post_type = 'reel'`، العمود `video_url` (يُحذف من التخزين فور النشر). المُصيِّر: `automation/src/render/reel.ts` (Playwright يلتقط إطارات `seek(t)` + ffmpeg، 1080×1920، 30fps، 13.5–16ث: قطعات كل 2–4 نبضات على إيقاع الموسيقى، كل صور المنتج، انتقالات slide/zoom/iris/up/wipe، ميل ثلاثي الأبعاد وparallax، كتابة حركية كلمة بكلمة). كابشن الريل وهوكه من نفس نداء OpenAI. منتج الريل لا يتكرر مع منشورات نفس اليوم.
- الموسيقى: 9 مقاطع مبهجة (97–122 BPM) من Pixabay (رخصة تجارية بلا إسناد) في bucket **خاص** `social-music` (لا تُرفع للريبو العام) بصوت ≈ -18 LUFS. `tracks.json` فيه bpm وoffset لكل مقطع (من `music/analyze_beats.py`) ليبدأ المقطع على نبضة عند t=0. التراخيص في `LICENSES.md`. تدوير حسب عدد الريلز.
- النشر: `meta.ts` (`media_type=REELS`, `share_to_feed=true`, polling حتى 10 دقائق). التحقق دون نشر: `gh workflow run social-publish.yml -f check_reel=<post_id>`. تحويل منشور إلى ريل بنفس الكابشن: `social-generate.yml -f mode=regenerate -f post_id=… -f what=to-reel`. توليد خانات محددة: `-f mode=today -f extra_args="--date=… --only=reel@13:00 --jitter=0"`.
- التنظيف (`automation/src/cleanup.ts`، يعمل بعد التوليد اليومي): صور المنشورات/الستوريات بعد 14 يومًا من موعدها، ومجلدات الأيام اليتيمة بعد 16 يومًا. ffmpeg غير مثبّت على runner → خطوة تثبيته في `social-generate.yml`.
- الريبو **عام** ⇒ دقائق GitHub Actions مجانية وغير محدودة؛ لو صار خاصًا راجع استهلاك `social-publish.yml` (كل 15 دقيقة) وانقل النشر بالكامل إلى مسار Vercel الذي يستدعيه pg_cron.
