# HATTAH (حَطّة) — دليل المشروع

متجر للمنتجات الفلسطينية. Next.js 15 + TypeScript + Tailwind v4 + Supabase + next-intl (عربي RTL / إنجليزي / تركي). النشر على Vercel تلقائيًا مع كل `git push` على `main`.

## البنية
- `src/app/[locale]/(site)/` — واجهة المتجر العامة. `src/app/[locale]/admin/` — لوحة الأدمن (محمية بجلسة، `login` + `(protected)`).
- `src/actions/` — Server Actions (auth, categories, products, inventory). كلها تبدأ بـ `assertAdminSession()`.
- `src/lib/supabase/` — `public.ts` (anon)، `service.ts` (service role، سيرفر فقط)، `types.ts`.
- `src/lib/inventory-period.ts` — حساب فلتر الفترة الزمنية (بالسنتات كأعداد صحيحة).
- `messages/{ar,en,tr}.json` — الترجمات. واجهة الأدمن عربية فقط (نصوص مباشرة).
- `supabase/migrations/NNN_*.sql` — الـ migrations مرقّمة (آخر واحد 027). `supabase/schema.sql` المخطط الكامل.
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
سكربتات Node/TS (Playwright + OpenAI + Meta Graph API) تعمل عبر GitHub Actions (`social-generate.yml` يوميًا 03:00 إسطنبول، `social-publish.yml` كل ساعة عند :35). جداول `social_posts` و`social_settings` (migration 013، الجدول الزمني في 026: 6 منشورات + 2 كاروسيل + 3 ريلز + 8 ستوريات يوميًا) وbucket عام `social-posts`. واجهة الأدمن: `/admin/social` (+`/settings`). الأعمال الثقيلة (توليد/إعادة توليد/نشر الآن) تُطلق من الواجهة عبر `workflow_dispatch` (`GH_DISPATCH_TOKEN`). `DRY_RUN=true` يمنع أي استدعاء لـ Meta. الإعداد: `automation/SETUP_AR.md`.

### الريلز (من 26/10)
- `post_type = 'reel'`، العمود `video_url` (يُحذف من التخزين فور النشر). المُصيِّر: `automation/src/render/reel.ts` (Playwright يلتقط إطارات `seek(t)` + ffmpeg، 1080×1920، 30fps، 13.5–16ث: قطعات كل 2–4 نبضات على إيقاع الموسيقى، كل صور المنتج، انتقالات slide/zoom/iris/up/wipe، ميل ثلاثي الأبعاد وparallax، كتابة حركية كلمة بكلمة). كابشن الريل وهوكه من نفس نداء OpenAI. منتج الريل لا يتكرر مع منشورات نفس اليوم.
- الموسيقى: 10 مقاطع مبهجة (97–122 BPM) من Pixabay (رخصة تجارية بلا إسناد) في bucket **خاص** `social-music` (لا تُرفع للريبو العام) بصوت ≈ -18 LUFS. `tracks.json` فيه bpm وoffset لكل مقطع (من `music/analyze_beats.py`) ليبدأ المقطع على نبضة عند t=0. التراخيص في `LICENSES.md`. تدوير حسب عدد الريلز.
- النشر: `meta.ts` (`media_type=REELS`, `share_to_feed=true`, polling حتى 10 دقائق). التحقق دون نشر: `gh workflow run social-publish.yml -f check_reel=<post_id>`. تحويل منشور إلى ريل بنفس الكابشن: `social-generate.yml -f mode=regenerate -f post_id=… -f what=to-reel`. توليد خانات محددة: `-f mode=today -f extra_args="--date=… --only=reel@13:00 --jitter=0"`.
- التنظيف (`automation/src/cleanup.ts`، يعمل بعد التوليد اليومي): صور المنشورات/الستوريات بعد 14 يومًا من موعدها، ومجلدات الأيام اليتيمة بعد 16 يومًا. ffmpeg غير مثبّت على runner → خطوة تثبيته في `social-generate.yml`.
- الريبو **عام** ⇒ دقائق GitHub Actions مجانية وغير محدودة؛ لو صار خاصًا راجع استهلاك `social-publish.yml` (كل 15 دقيقة) وانقل النشر بالكامل إلى مسار Vercel الذي يستدعيه pg_cron.

### تكلفة OpenAI (من 25/10)
- التعليمات الثابتة (`FIXED_INSTRUCTIONS` في `captions.ts`) أولًا وبيانات المنتج آخرًا ⇒ prompt caching (~2000 توكن مخبّأ). الستوريات بوضع `design` (عنوان + سطر فرعي فقط). لا قائمة 30 يومًا في الـ prompt: التكرار يُفحص بالكود، وتُرسل آخر 10 عناوين فقط. إصلاح التقليم/الأرقام/عدد الكلمات بالكود؛ الإعادة للفشل الحقيقي فقط. `reasoning.effort=low`.
- التوليد اليومي 03:00 عبر OpenAI Batch API (`generate.ts --batch` ⇒ جدول `social_batches` ⇒ `collect.ts` عبر `social-collect.yml` يُطلقه مسار Vercel)، ومسار احتياطي بالاستدعاءات العادية عند 07:00 إسطنبول أو فشل الإرسال. أزرار الأدمن (إعادة/تبديل/«توليد الغد») فورية وعادية.
- المفتاح `hattah-social-v2` (Restricted: Responses/Files/Batch Write + Models Read) في سر `OPENAI_API_KEY`؛ القديم `hattah-social` مُلغى.
- القياس: `gh workflow run social-openai-bench.yml -f variant=baseline|new|batch` (لا يكتب في قاعدة البيانات). النتائج ليوم كامل: قبل 0.214$، بعد (عادي) 0.083$، Batch 0.036$.

### تعديلات الأدمن اليدوية
- **المالك يعدّل المنشورات من لوحة `/admin/social` بنفسه** (تبديل المنتج، إعادة التصميم/الكابشن، اعتماد/إلغاء اعتماد، «انشر الآن»). هذا طبيعي: لا تعتبر أي تغيّر في المنتج أو الحالة (مثل `draft` بعد «تبديل المنتج») أو تشغيلة `workflow_dispatch` غير مفسّرة، ولا تُبلّغ عنه كمشكلة. مع ذلك تأكد قبل الموعد أن ما سيُنشر `approved` ووسائطه تعمل، واعتمد ما بقي `draft` إن كان المطلوب نشره.

### ستوريات فيديو (من 26/10)
- كل ستوري فيديو 7 ثوانٍ (1080×1920، 30fps) من نفس قالب الستوري الثابت: `render/story.ts` يحرّك الـ DOM نفسه (تكبير/parallax للصورة، ظهور اللوغو، كلمات نصّية متتابعة RTL، السعر بـpop، CTA). الموسيقى من `social-music` بـ ≈ -20 LUFS مع fade. الغلاف (`image_url`) لقطة من الفيديو. `STORY_VIDEO=false` يرجّع الصور الثابتة.
- النشر `media_type=STORIES` + `video_url` (polling حتى 10 دقائق)، ويُحذف الفيديو من التخزين فور النشر. التحقق دون نشر: `social-publish.yml -f check_reel=<post_id>`. إعادة رسم ستوريات موجودة كفيديو بنفس المنتج والنص: `social-generate.yml -f mode=regenerate -f post_id=id1,id2,… -f what=image`.
- الموسيقى: `chooseTrack(kind)`؛ الريلز قاعدة صارمة (لا تكرار بين ريلز خلال ±3 أيام). 11 فيديو يوميًا مقابل 10 مقاطع تجعل «لا تكرار» للستوريات مستحيلًا حسابيًا، فالستوريات تتفادى مقاطع ريلز اليوم ثم الأقل تكرارًا ثم الأقدم استخدامًا.

### كاروسيل، تركي، هاشتاغات، موقع (من 25/10)
- **الكاروسيل** (`post_type='carousel'`، العمود `slides` jsonb، `image_url` = الشريحة الأولى): 3–5 شرائح 1080×1350: شريحة تصميم (قالب المنشور) + حتى 3 صور للمنتج (`render/carousel.ts`) + شريحة تفاصيل (الأسطر التي كتبها الموديل + المقاسات/الألوان + السعر + الرابط والواتساب). منتجات بـ3+ صور ليست في منشورات/ريلز نفس اليوم؛ بدونها يتحول الموعد إلى منشور عادي. النشر: حاويات الأبناء ثم حاوية الكاروسيل ثم النشر (`meta.ts`). التحقق دون نشر: `gh workflow run social-publish.yml -f check_reel=<post_id>` (يدعم الكاروسيل). مواعيده 10:45 و21:00 (ستوري 21:15 صار 21:30).
- **فقرة تركية** (2–3 أسطر) بين العربي والإنجليزي في كل كابشن (`caption_languages` فيه `tr`؛ طول 600–1000 يُقاس بدونها). لإضافتها لكابشنات موجودة دون إعادة كتابتها: `social-generate.yml -f mode=fixup -f extra_args="--date=YYYY-MM-DD"` (`caption-fixup.ts`، يعيد توليد الهاشتاغات أيضًا).
- **هاشتاغات** (`hashtags.ts`): 3 كبيرة + 4 متوسطة + 3 متخصصة/محلية بالعربي والتركي والإنجليزي، تدوير حسب الأقل استخدامًا، ولا تتكرر مجموعة مرتين في اليوم. تصنيف الأحجام تقديري (ليس أرقامًا مقاسة).
- **موقع إسطنبول**: `social_settings.location_id = 106012156106461` (Facebook Places ID لإسطنبول من Wikidata P1997؛ جُرّب بـ Graph API). يُرسل مع المنشورات والكاروسيل والريلز؛ إن رفضه إنستغرام يُنشر العنصر بدونه. ID الاستكشاف 212903416 مرفوض.
- ستوريات 25/10 من 19:00 وستوريات 26/10 كلها فيديو.
