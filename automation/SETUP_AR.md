# إعداد نظام السوشيال ميديا — خطوة بخطوة

> كل شيء في الكود جاهز. الباقي ٤ خطوات تحتاج حساباتك أنت. خذ وقتك، وإذا علقت في أي خطوة ابعث لي لقطة شاشة.

---

## الخطوة 1 — تشغيل الـ migration على Supabase (دقيقتان)

1. افتح [supabase.com/dashboard](https://supabase.com/dashboard) وادخل مشروع **Hattah**.
2. من القائمة اليسرى اضغط **SQL Editor**.
3. اضغط **New query**.
4. افتح الملف `supabase/migrations/013_add_social_posts.sql` من المشروع، انسخ كل محتواه والصقه في المحرر.
5. اضغط **Run** (أو `Cmd + Enter`). لازم تظهر عبارة **Success**.
6. تأكد: من **Table Editor** لازم يظهر جدولان جديدان `social_posts` و`social_settings`، ومن **Storage** لازم يظهر bucket اسمه `social-posts` (علامة Public).

---

## الخطوة 2 — إنشاء تطبيق Meta وتوكن لا ينتهي

### شرط مسبق
- حساب إنستغرام `hattah.store.co` لازم يكون **Business** أو **Creator** (من إنستغرام: الإعدادات ← نوع الحساب والأدوات).
- لازم يكون **مربوطًا بصفحة فيسبوك "Hattah حَطّة"** (من إنستغرام: الإعدادات ← الحسابات المرتبطة ← فيسبوك، أو من الصفحة: الإعدادات ← الحسابات المرتبطة ← إنستغرام).
- لازم يكون عندك **Meta Business Portfolio** (business.facebook.com) والصفحة وحساب إنستغرام ضمنه.

### أ) إنشاء التطبيق
1. افتح [developers.facebook.com/apps](https://developers.facebook.com/apps) وسجّل دخول بحساب فيسبوك المسؤول عن الصفحة.
2. اضغط **Create App**.
3. اكتب اسم التطبيق: `Hattah Social`، وبريدك، ثم **Next**.
4. في "Use cases" اختر **Other** ثم **Next**، ثم نوع التطبيق **Business** ثم **Next**.
5. اختر الـ Business Portfolio الخاص بحطّة من القائمة، ثم **Create app**.
6. من القائمة اليسرى: **App settings ← Basic**. انسخ **App ID** (نحتاجه بعد قليل).
   - ضع في **Privacy Policy URL**: `https://hattah-store.vercel.app` (مؤقتًا) واحفظ.

### ب) إنشاء System User (المستخدم النظامي)
1. افتح [business.facebook.com/settings](https://business.facebook.com/settings) (إعدادات الأعمال).
2. القائمة اليسرى: **Users ← System users**.
3. اضغط **Add**، الاسم: `hattah-bot`، الدور: **Admin**، ثم **Create system user**.
4. اضغط على `hattah-bot` ثم **Add assets**:
   - تبويب **Pages** ← اختر صفحة "Hattah حَطّة" ← فعّل **Full control (Manage Page)** ← **Save**.
   - تبويب **Instagram accounts** ← اختر `hattah.store.co` ← **Full control** ← **Save**.
   - تبويب **Apps** ← اختر `Hattah Social` ← **Full control** ← **Save**.

### ج) توليد التوكن
1. وأنت داخل `hattah-bot` اضغط **Generate new token**.
2. اختر التطبيق `Hattah Social`.
3. **Token expiration**: اختر **Never** (لا ينتهي).
4. فعّل هذه الصلاحيات (ابحث عن كل واحدة بالاسم):
   `instagram_basic`، `instagram_content_publish`، `pages_manage_posts`، `pages_read_engagement`، `pages_show_list`، `business_management`
5. اضغط **Generate token** وانسخ التوكن فورًا (لا يظهر مرة ثانية) — هذا هو `META_ACCESS_TOKEN`. **لا ترسله لأحد ولا تضعه في أي ملف داخل المشروع.**

### د) استخراج META_PAGE_ID و META_IG_USER_ID
1. افتح [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer).
2. من اليمين: **Meta App** ← اختر `Hattah Social`.
3. في حقل **Access Token** الصق التوكن الذي نسخته.
4. **لمعرفة Page ID:** اكتب في خانة الطلب `me/accounts` (الطريقة GET) واضغط **Submit**. سيظهر اسم الصفحة وبجانبه `id` — هذا `META_PAGE_ID`.
   - إذا رجع فارغًا: افتح صفحتك على فيسبوك ← **About** ← أسفل الصفحة **Page ID**.
5. **لمعرفة Instagram ID:** اكتب `PAGE_ID?fields=instagram_business_account` (استبدل `PAGE_ID` بالرقم السابق) واضغط **Submit**. الرقم داخل `instagram_business_account.id` هو `META_IG_USER_ID`.
6. تأكد: `IG_USER_ID?fields=username` لازم يرجع `hattah.store.co`.

> إذا ظهر خطأ "app not live / permissions" عند أول نشر: من لوحة التطبيق اضغط الزر في الأعلى لتحويل التطبيق من **Development** إلى **Live** (يطلب رابط Privacy Policy وأيقونة).

---

## الخطوة 3 — مفتاح OpenAI مخصّص للمشروع

1. افتح [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. اضغط **Create new secret key**.
3. الاسم: `hattah-social`. (اختياري: اختر المشروع المخصّص لك.)
4. اضغط **Create secret key** وانسخ المفتاح فورًا — هذا `OPENAI_API_KEY`.
5. تأكد أن عندك رصيد (Billing ← Add payment details) — تكلفة الكابشن ضئيلة (سنتات في الشهر).

---

## الخطوة 4 — وضع الأسرار

### أ) GitHub (لتشغيل التوليد والنشر)
1. افتح [github.com/SaadOsama10/hattah-store/settings/secrets/actions](https://github.com/SaadOsama10/hattah-store/settings/secrets/actions).
2. اضغط **New repository secret** وأضف كل واحد من هذه (الاسم بالضبط ← القيمة):

| الاسم | القيمة |
|---|---|
| `SUPABASE_URL` | نفس `NEXT_PUBLIC_SUPABASE_URL` من `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | نفس القيمة في `.env.local` |
| `OPENAI_API_KEY` | من الخطوة 3 |
| `META_PAGE_ID` | من الخطوة 2-د |
| `META_IG_USER_ID` | من الخطوة 2-د |
| `META_ACCESS_TOKEN` | من الخطوة 2-ج |

(أو أعطني القيم هنا في المحادثة وأنا أضيفها بأمر `gh secret set` — حسب ما تفضّل.)

### ب) توكن لتشغيل GitHub من لوحة الأدمن (`GH_DISPATCH_TOKEN`)
1. افتح [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
2. **Token name**: `hattah-admin-dispatch`، **Expiration**: سنة (حدّد تذكيرًا لتجديده).
3. **Repository access** ← **Only select repositories** ← `hattah-store`.
4. **Permissions ← Repository permissions ← Actions** ← **Read and write**.
5. **Generate token** وانسخه.

### ج) Vercel (للوحة الأدمن)
1. افتح [vercel.com](https://vercel.com) ← مشروع المتجر ← **Settings ← Environment Variables**.
2. أضف (لكل البيئات Production + Preview): `META_PAGE_ID`، `META_IG_USER_ID`، `META_ACCESS_TOKEN`، `GH_DISPATCH_TOKEN`.
3. اضغط **Redeploy** على آخر Deployment ليأخذ المتغيرات.

---

## بعد ما تنتهي

ابعث لي "خلّصت" وأنا:
1. أشغّل **اختبار الاتصال** (Test connection).
2. أولّد منشورًا حقيقيًا ونراجعه معًا في `/admin/social`، ثم ننشره على إنستغرام ونتأكد منه سوية.
3. بعدها تفعّل **النشر التلقائي** من `/admin/social/settings`.

## الاستخدام اليومي

- **كل ليلة 03:00 (إسطنبول)** يُولَّد تلقائيًا اليوم التالي كاملًا: 6 منشورات + 2 كاروسيل + 3 ريلز + 8 ستوريات (19 عنصرًا، من 09:00 إلى 23:59).
- ادخل **/admin/social** ← راجع كل بطاقة: عدّل الكابشن أو الموعد، **اعتماد**، أو **إعادة التصميم / الكابشن / تبديل المنتج / تجاهل**.
- فقط المنشورات **المعتمدة** تُنشر (ما لم تفعّل "اعتماد تلقائي").
- المنشورات تُنشر عند `:35` من كل ساعة بعد موعدها (12:30 → 12:35 تقريبًا).
- **انشر الآن**: ينشر بطاقة واحدة فورًا (يستغرق 1–3 دقائق عبر GitHub).
- **السجل**: روابط كل ما نُشر.
- استبعاد منتج من النشر: من **الإعدادات** ← "منتجات مستثناة".

## استكشاف الأخطاء

- حالة **فشل** على بطاقة: يظهر نص الخطأ عليها. أصلح السبب ثم اضغط **انشر الآن** (إذا نجح إنستغرام وفشل فيسبوك فلن يُعاد نشر إنستغرام).
- شاهد سجلات التشغيل: GitHub ← **Actions** ← `Social — generate posts` أو `Social — publish due posts`.
- تجربة بدون نشر حقيقي: Actions ← اختر الـ workflow ← **Run workflow** ← فعّل `dry_run`.
- تشغيل محلي: `cd automation && cp .env.example .env` (املأه) ثم `npm run generate` أو `DRY_RUN=true npm run publish`.

## الجدول اليومي الثابت (من 27/10: 16 عنصرًا؛ 26/10 وما قبله كان 8 ستوريات)
- **منشورات (6):** 09:15، 11:15، 14:45، 16:30، 18:15، 22:00
- **ريلز (3):** 13:00، 17:45، 20:00
- **ستوريات (5):** 12:00، 15:35، 19:05، 21:30، 23:30 (خُفّضت من 8 لأن المشاهدات تنخفض مع كثرتها؛ migration 028)
- **كاروسيل (2):** 10:45، 21:00 (3–5 شرائح؛ كل كابشن يحوي فقرة تركية، ووسوم 3+4+3 بثلاث لغات، ووسم موقع إسطنبول)
- إزاحة عشوائية ±10 دقائق، ومحصورة بين 09:00 و23:59. التدوير: N = المنتجات المؤهلة ÷ 6 (حد أدنى 3).

## الريلز
- فيديو عمودي 1080×1920 (13.5–16 ثانية، 30fps): هوك قوي في أول ثانية ونصف، ثم قطعات على إيقاع الموسيقى كل ~1.5–2 ثانية بين كل صور المنتج (أقواس/دوائر/مستطيلات) مع انتقالات (slide, zoom-through, iris, wipe) وميل ثلاثي الأبعاد وparallax وكتابة حركية كلمة بكلمة (RTL)، يظهر الاسم ثم السعر بعدّاد، وتنتهي ببطاقة (الشعار + رابط المتجر + واتساب). خطوط Amiri/Playfair وألوان القوالب نفسها.
- الموسيقى 10 مقاطع مبهجة (97–122 BPM، بلا غناء) من Pixabay (مرخّصة تجاريًا بلا إسناد)، محفوظة في bucket خاص `social-music` (الصوت ≈ -18 LUFS مع fade) — التفاصيل في `automation/music/LICENSES.md`.
- النشر عبر Instagram Graph API (REELS + مشاركة في الفيد). الفيديو يُحذف من التخزين فور النشر، وصور الأيام القديمة تُنظَّف تلقائيًا بعد 14 يومًا.
- في `/admin/social` يظهر مشغّل فيديو لكل ريل مع نفس أزرار التحكم (اعتماد، إعادة التصميم، تبديل، نشر الآن…).
