# مراجعة تطبيق Meta — "Hattah Social" (App ID 1438668817590445)

> الحالة: **لم يُقدَّم أي طلب.** عند محاولة إضافة صلاحية إلى المراجعة تعرض Meta شرطًا: يجب أن يصبح التطبيق **Tech Provider** (قرار لا رجعة فيه) ويمرّ بـ: التحقق من النشاط التجاري، التحقق من الوصول، ومراجعة التطبيق.

## 1) القرار المطلوب منك قبل أي خطوة

| الخيار | ما يعنيه | المخاطر |
|---|---|---|
| **أ) Tech Provider على نفس التطبيق** | يفتح "إضافة إلى مراجعة التطبيقات" لكل الصلاحيات | لا رجعة فيه؛ مصمَّم لشركات تخدم عملاء آخرين؛ يتطلب Business Verification ومستندات رسمية؛ قد يُرفض لأنك تنشر لحسابك فقط |
| **ب) إنشاء تطبيق جديد من نوع Consumer/Other** | تطبيق منفصل يظهر فيه مفتاح Development/Live ويمكن تحويله إلى Live بعد رابط الخصوصية والأيقونة (جاهزان) | يحتاج توكن جديدًا وتحديث 3 أسرار؛ لا ضمان أن تُقبل صلاحية النشر على الصفحة دون مراجعة |
| **ج) الاكتفاء بإنستغرام** (الوضع الحالي) | ينشر على إنستغرام بشكل مضمون | فيسبوك يدوي أو غير مرئي للعامة |

توصيتي: جرّب **ب** أولًا (لا رجعة فيه غير موجود، ويستغرق ساعة)، ولا تضغط Tech Provider إلا إذا فشل.

## 2) الصلاحيات المطلوبة ووصف الاستخدام (انسخه بالإنجليزية كما هو)

**اسم الاستخدام العام:** HATTAH publishes its own product posts to its own Facebook Page and Instagram account.

- **pages_manage_posts** — HATTAH (a Palestinian heritage store based in Istanbul) uses this permission to publish its own product photos with captions to its own Facebook Page "Hattah حَطّة". Posts are generated from our product catalogue, reviewed/approved by an administrator in our private admin panel, and then published on a schedule. The app only acts on the Page owned by the business that owns the app. No third-party Pages or users are involved.
- **pages_read_engagement** — Used to read the Page's own published posts (id, status, permalink) to confirm that a scheduled post was published successfully and to show its link in our admin panel. No user data is collected.
- **pages_show_list** — Used to find our own Page id during setup, so the publisher posts to the correct Page.
- **instagram_basic** — Used to read our own Instagram professional account's username and media permalinks to verify the account being published to and show links in our admin panel.
- **instagram_content_publish** — Used to publish our own product images (feed posts and stories) with captions to our own Instagram professional account `@hattah.store.co` via the Content Publishing API, after administrator approval.
- **business_management** — Used only to read the Business Portfolio assets (our Page and Instagram account) assigned to our system user, so the access token can be tied to the correct assets.

**Data handling:** We do not collect, store or share personal data of Facebook/Instagram users. The app only publishes our own content. Privacy policy: https://hattah-store.vercel.app/en/privacy — Data deletion instructions: https://hattah-store.vercel.app/en/data-deletion

## 3) سيناريو تسجيل الفيديو (لكل صلاحية، 60–90 ثانية، بالإنجليزية أو مع نصوص)

1. افتح `https://hattah-store.vercel.app/ar/admin/login` وسجّل الدخول (هذا الجزء تقوم به أنت أو ننشئ حساب مراجع، انظر 4).
2. اذهب إلى **/admin/social** وأرِ قائمة المنشورات المولّدة (صورة + كابشن + موعد).
3. اضغط **اعتماد** على منشور، ثم **انشر الآن**.
4. افتح صفحة فيسبوك "Hattah حَطّة" في نافذة أخرى وأرِ المنشور الظاهر (pages_manage_posts + pages_read_engagement).
5. افتح إنستغرام `@hattah.store.co` وأرِ نفس المنشور (instagram_content_publish + instagram_basic).
6. عُد إلى لوحة الأدمن وأرِ رابط المنشور الناتج (يقرأ الـ permalink).
7. أرِ **/admin/social/settings** (اختيار الصفحة/الحساب) لصلاحيتي pages_show_list وbusiness_management.

ملاحظة: التسجيل يتم عبر QuickTime (File ▸ New Screen Recording). لا أستطيع تسجيل فيديو MP4 بنفسي من Chrome، وبإمكاني تجهيز الصفحات والتحقق منها لحظة التسجيل.

## 4) حساب اختبار للمراجعين

لوحة الأدمن تعمل بكلمة مرور واحدة. للمراجعين نحتاج إما مشاركة كلمة مرور مؤقتة تغيّرها بعد المراجعة، أو إضافة وضع "عرض فقط" بحساب منفصل. **لن أنشئ أي حساب قبل موافقتك.**

## 5) التحقق من النشاط التجاري (Business Verification) — المستندات المطلوبة في تركيا

يطلبها Meta غالبًا عبر Business Manager ← إعدادات الأعمال ← مركز الأمان ← **بدء التحقق**:

1. **الاسم القانوني الكامل** للنشاط كما هو مسجّل رسميًا، وعنوانه، ورقم هاتف ثابت أو بريد على دومين النشاط.
2. أحد المستندات الرسمية (يظهر فيه الاسم والعنوان بوضوح): **Vergi Levhası** (لوحة الضريبة)، أو **سجل التجارة (Ticaret Sicil Gazetesi)**، أو **Faaliyet Belgesi** من الغرفة التجارية.
3. فاتورة خدمات (كهرباء/ماء/إنترنت) باسم النشاط وعنوانه، أو كشف حساب بنكي حديث.
4. موقع إلكتروني يطابق اسم النشاط (لدينا: hattah-store.vercel.app).
5. **ملاحظة:** إن كان النشاط غير مسجّل رسميًا (متجر فردي بلا Vergi Levhası) فالتحقق قد لا يكتمل، وهذا سبب إضافي لتجربة الخيار (ب) أو (ج).
