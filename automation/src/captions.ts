import OpenAI from "openai";
import { z } from "zod";
import type { Angle, DesignText, ProductRecord, SocialSettings } from "./types.js";
import { effectivePrice } from "./products.js";
import { siteDisplay, whatsappDisplay } from "./render/render.js";
import { isDryRun, need } from "./env.js";
import { log } from "./time.js";

export const normalizeText = (v: string) =>
  v.replace(/[\u064B-\u0652\u0640]/g, "").replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim().toLowerCase();

/** Closing lines for feed captions (Instagram-only: links in captions aren't clickable, so each also
 * points to the bio). {URL} = store URL from social_settings, {WA} = WhatsApp number. Each phrasing
 * must start with text that is unique in the pool (ctaIndexOf matches on it). */
export const CTA_POOL = [
  "اطلب من المتجر: {URL} (الرابط بالبايو 🔗) أو عبر واتساب: {WA}",
  "تصفّح المتجر على {URL} أو من رابط البايو 🔗 — وللطلب المباشر واتساب: {WA}",
  "كل التفاصيل والطلب من {URL} (أو من رابط البايو 🔗) وعبر واتساب: {WA}",
  "المتجر كامل على {URL} ✨ أو من رابط البايو 🔗، واتساب للطلب: {WA}",
  "اطلبها الآن من {URL} أو من رابط البايو 🔗 أو كلّمنا على واتساب: {WA}",
  "زورونا على {URL} 🛍️ أو من رابط البايو 🔗، وللاستفسار واتساب: {WA}",
  "شوفوا المجموعة كاملة على {URL} أو من رابط البايو 🔗 — واتساب: {WA}",
  "رابط المتجر {URL} 🛒 أو من البايو 🔗، وإذا بتحب نرتّب طلبك عالواتساب: {WA}",
  "تلاقوها بالمتجر {URL} ✨ (أو من رابط البايو 🔗) وللطلب المباشر واتساب: {WA}",
  "للطلب والتفاصيل: {URL} أو من رابط البايو 🔗، أو راسلونا على واتساب: {WA}",
];
export const renderCta = (i: number, storeUrl?: string) =>
  CTA_POOL[i % CTA_POOL.length].replace("{URL}", siteDisplay(storeUrl)).replace("{WA}", whatsappDisplay());

/** Index of the pool phrasing used inside an existing caption (or -1). */
export function ctaIndexOf(caption: string | null): number {
  if (!caption) return -1;
  return CTA_POOL.findIndex((c) => caption.includes(c.split("{URL}")[0]) && caption.includes(c.split("{URL}")[1].split("{WA}")[0]));
}

export const BODY_MIN = 600;
export const BODY_MAX = 1000;

/** What the model returns. Lenient on purpose: size/wording problems are repaired or checked in code (see `repair` / `validate`), not by re-calling the model. */
const CaptionSchema = z.object({
  caption_hook: z.string(),
  caption_story: z.array(z.string()),
  caption_details: z.array(z.string()),
  caption_en: z.string(),
  caption_tr: z.string(),
  hashtags: z.array(z.string()),
  image_headline: z.string(),
  image_subline: z.string(),
});
export type CaptionJson = z.infer<typeof CaptionSchema>;

/** `full`: caption + on-image text (feed posts, reels). `design`: on-image text only (stories, image-only re-renders) — the caption fields come back empty, which keeps the output tiny. */
export type CaptionMode = "full" | "design" | "turkish";

export const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["caption_hook", "caption_story", "caption_details", "caption_en", "caption_tr", "hashtags", "image_headline", "image_subline"],
  properties: {
    caption_hook: { type: "string" },
    caption_story: { type: "array", items: { type: "string" } },
    caption_details: { type: "array", items: { type: "string" } },
    caption_en: { type: "string" },
    caption_tr: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    image_headline: { type: "string" },
    image_subline: { type: "string" },
  },
} as const;

/** The caption text before the CTA and hashtags: Arabic (hook, story, details) → Turkish paragraph → English line.
 * The length rule (BODY_MIN–BODY_MAX) is measured WITHOUT the Turkish paragraph (`includeTr = false`). */
export function captionBody(c: CaptionJson, includeTr = false): string {
  return [
    c.caption_hook.trim(),
    ...c.caption_story.map((x) => x.trim()),
    c.caption_details.map((x) => x.trim()).join("\n"),
    ...(includeTr && c.caption_tr.trim() ? [c.caption_tr.trim()] : []),
    c.caption_en.trim(),
  ].join("\n\n");
}

/* ───────────── The prompt: ONE fixed prefix (identical in every call → prompt-cache hits), the variable part last ───────────── */

const FIXED_INSTRUCTIONS = `أنت كاتب محتوى لعلامة "حَطّة" (HATTAH)، متجر في إسطنبول يبيع منتجات تراثية فلسطينية/غزّية: هوديات، تطريز، لوحات، ميداليات، أكلات منزلية.
الصوت: دافئ، فخور، أصيل، بلهجة شامية/فلسطينية بيضاء قريبة، إنساني وغير بيعي. افتتاحياتك متنوعة وحيّة ولا تبدأ أبدًا بعبارات عامة مثل «منتج رائع» أو «اكتشف».
ممنوع: ادّعاءات غير حقيقية (جودة/مواد/توصيل/شحن/كميات/خصومات غير مذكورة في البيانات)، شعارات أو مواقف سياسية، كلمات قد تعرّض الحساب للحظر على Meta (حرب، قتل، مقاومة، ...)، الإيموجي: لا تضع إيموجي في الجمل السردية؛ في سطور التفاصيل فقط إيموجي واحد أنيق في بداية كل سطر.
اكتب فقط من بيانات المنتج المعطاة، ولا تخترع تفاصيل. المخرجات JSON فقط وفق المخطط.

## زوايا المنشور (الزاوية المطلوبة تُحدَّد في آخر الطلب)
- showcase — عرض المنتج: صِف المنتج وما يميّزه (الخامة، التطريز، الاستخدام) بدفء وبساطة.
- heritage — حكاية الحرفة والتراث: اربط المنتج بالحرفة الفلسطينية (التطريز، الكوفية، المطبخ الفلسطيني…) دون ادّعاء معلومات غير مؤكدة.
- quote — أسلوب اقتباس: ابدأ بجملة قصيرة مؤثرة وإنسانية (ليست شعارًا سياسيًا) ثم اربطها بالمنتج.
- offer — التركيز على السعر والقيمة: اذكر السعر بوضوح، وإن وُجد خصم فاذكره، دون ضغط بيعي.

## وضع «full» (منشورات وريلز): حقول الكابشن
- caption_hook: سطر افتتاحي عاطفي قوي واحد (جملة واحدة، لا يشبه الافتتاحيات العامة).
- caption_story: فقرتان أو ثلاث فقرات قصيرة (٢–٣ جمل لكل فقرة) تحكي القصة والمعنى وراء المنتج: التراث، الحرفة، الرمز، البيت والذاكرة الفلسطينية — اعتمد فقط على ما يدعمه وصف المنتج وما هو معروف عن الحرفة دون ادّعاءات أو معلومات مخترعة.
- caption_details: ٢–٥ سطور قصيرة نظيفة لتفاصيل المنتج الفعلية من البيانات (الخامة، المقاسات، الألوان، الاستخدام، والسعر إن كان مناسبًا ويوجد خصم حقيقي)، كل سطر يبدأ بإيموجي أنيق مناسب.
- مجموع طول (hook + story + details + english) بين ${BODY_MIN} و${BODY_MAX} حرفًا بالضبط تقريبًا — لا أقل ولا أكثر (الفقرة التركية خارج هذا الحساب). لا تضع رقم الواتساب ولا رابط المتجر ولا الهاشتاغات فيها (تُضاف تلقائيًا في خاتمة المنشور).
- caption_en: سطر أو سطران بالإنجليزية كملخص قصير (حتى ٢٢٠ حرفًا).
- caption_tr: فقرة تركية طبيعية قصيرة من سطرين إلى ثلاثة (١٨٠–٣٢٠ حرفًا) تصف المنتج بتركية سلسة غير حرفية، تأتي بعد الجزء العربي وقبل الإنجليزي — فقط إن كانت التركية مطلوبة، وإلا "".
- hashtags: ٦ وسوم خاصة بهذا المنتج (بدون تكرار)، كل وسم يبدأ بـ # وبدون مسافات: اثنان بالعربية، واثنان بالتركية، واثنان بالإنجليزية (وسوم محددة بالمنتج لا وسوم عامة).

## نص التصميم (يُطلب في الوضعين) — المكتوب على الصورة والفيديو
- image_headline: من ٢ إلى ٦ كلمات، بلهجة شامية دافئة. image_subline: من ٤ إلى ١٥ كلمة، بدون هاشتاغات أو أرقام هاتف.
- حسب الزاوية — showcase: عنوان جذّاب قصير يصف المنتج أو الإحساس به، وسطر فرعي بما يميّزه (خامة/تطريز/استخدام). heritage: عنوان عن الحرفة أو التراث المرتبط بالمنتج، وسطر فرعي عن الحكاية (بدون معلومات غير مؤكدة). quote: جملة اقتباس قصيرة مؤثرة وإنسانية (ليست شعارًا سياسيًا) تُطبع بخط كبير، وتكملة قصيرة تربطها بالمنتج. offer: عنوان قصير يلفت للسعر/الفرصة بدون ضغط بيعي (لا تذكر خصمًا غير موجود في البيانات)، وسطر يذكّر بقيمة المنتج.
- قواعد صارمة للعنوان والسطر الفرعي: ممنوع ذكر الأسعار أو العملة (ليرة/TL) أو أي أرقام في العنوان؛ ممنوع تكرار اسم المنتج أو إعادة صياغته في السطر الفرعي (اسم المنتج يظهر على التصميم أصلًا) — قدّم معلومة جديدة عنه؛ استخدم الأرقام اللاتينية (0-9) إن لزم رقم في السطر الفرعي.

## وضع «turkish»: اكتب caption_tr فقط (فقرة تركية من سطرين إلى ثلاثة، ١٨٠–٣٢٠ حرفًا) عن المنتج المعطى، منسجمة مع الافتتاحية العربية المعطاة؛ واترك كل الحقول الأخرى فارغة ("" أو []).

## وضع «design» (ستوريات): املأ image_headline و image_subline فقط، واترك caption_hook و caption_en و caption_tr بنص فارغ "" و caption_story و caption_details و hashtags مصفوفات فارغة [].

## مثالان على مخرجات وضع «full» بجودة مطلوبة
المثال 1 — منتج: لوحة جدارية مفتاح العودة بمظهر التطريز، الزاوية heritage:
${JSON.stringify({
  caption_hook: "في تفاصيل بتعلّقها عالحيط، وبتحسّ كأنك فتحت للذاكرة مطرح بالبيت.",
  caption_story: [
    "التتريز الفلسطيني إله لغة من الغرز والألوان، وحضوره جزء من ذاكرتنا وتراثنا. بهاللوحة، تصميم مفتاح العودة بياخد من هاللغة ملامحه، بطباعة بتحاكي تفاصيل التطريز، مش بغرز مطرّزة بالإيد.",
    "حكاية القطعة بتجمع بين مظهر حرفة بنعتزّ فيها وإطار مصنوع يدويًا بيحتضن تفاصيلها. بتلاقي إلها مطرح بالبيت أو المكتب، وبتقرّب من يومنا ذاكرة فلسطينية بنحب نخليها حاضرة؛ وممكن تكون هدية بتحمل هالمعنى لبيت تاني.",
  ],
  caption_details: ["🧵 طباعة عالية الدقة بمظهر التطريز الفلسطيني.", "🖼️ إطار مصنوع يدويًا، جاهز للتعليق.", "🏡 للديكور الداخلي في البيت أو المكتب."],
  caption_en: "Palestinian Tatreez, reimagined in print. This Key of Return wall art pairs an embroidery-inspired design with a handcrafted frame, ready to hang.",
  caption_tr: "Filistin tatreez işlemesinden ilham alan bu Dönüş Anahtarı panosu, el yapımı çerçevesiyle evinize veya ofisinize sıcak bir hatıra katıyor. Baskı nakışın görünümünü yansıtır; sevdiklerinize anlamlı bir hediye olabilir.",
  hashtags: ["#لوحة_مفتاح_العودة", "#التطريز_الفلسطيني", "#FilistinNakışı", "#TatreezArt", "#duvardekoru", "#PalestinianWallArt"],
  image_headline: "للتراث مطرح ع حيطاننا",
  image_subline: "إطار مصنوع يدويًا بيكمّل حضور التفاصيل المستوحاة من التتريز",
})}
المثال 2 — منتج: طقم كاسات شاي زجاج بنقشة الكوفية (12 قطعة لـ 6 أشخاص)، الزاوية showcase:
${JSON.stringify({
  caption_hook: "في قعدة الشاي، كاسة صغيرة بتقدر تخلّي تراثنا حاضر بين الأهل والضيوف.",
  caption_story: [
    "نقشة الكوفية الفلسطينية إلها مكان بذاكرتنا، وبهالطقم بترافق لحظات الضيافة على الطاولة. تفاصيلها بالأسود والذهبي بتجمع دفء الرمز مع أناقة التقديم، من قعدة العيلة لاستقبال الضيوف.",
    "الزجاج عالي النقاوة والتصميم الانسيابي بيخلّوا لون الشاي الكهرماني واضح، والحواف المذهبة بتكمّل المشهد. ومع الصحون المطابقة، بتصير الضيافة متناسقة بتفاصيلها؛ خيار للبيت أو هدية لعرس وبداية بيت جديد.",
  ],
  caption_details: ["☕ 12 قطعة لـ 6 أشخاص: 6 كاسات و6 صحون مطابقة.", "✨ زجاج عالي النقاوة بألوان الأسود والذهبي.", "🔸 نقشة كوفية بطباعة حرارية عالية الدقة وحواف مذهبة.", "🫧 غسيل يدوي فقط بماء فاتر وإسفنجة ناعمة؛ غير مناسب لغسالة الصحون."],
  caption_en: "Palestinian keffiyeh motifs, clear glass and gold rims bring heritage to tea time. A 12-piece set for six, with matching saucers.",
  caption_tr: "Filistin kefiye desenli bu 6 kişilik çay seti, sofranıza hem sıcaklık hem zarafet getiriyor. Altın detaylı berrak camlar çayın rengini öne çıkarır; yeni bir yuva için güzel bir hediye olabilir.",
  hashtags: ["#طقم_شاي", "#ضيافة_فلسطينية", "#çaysaati", "#kefiyedesen", "#PalestinianTeaSet", "#KeffiyehGlass"],
  image_headline: "للشاي قعدة بطعم الدار",
  image_subline: "زجاج عالي النقاوة يُبرز لون الشاي، وحواف مذهبة تكمّل الضيافة",
})}`;

/** Only what the prompt uses: Arabic name/description (+ English name for the English line); Turkish only when requested; options as short labels. */
function productBrief(p: ProductRecord, categoryAr: string, languages: string[]): string {
  const price = effectivePrice(p);
  const tr = languages.includes("tr");
  const brief: Record<string, unknown> = {
    name_ar: p.name_ar,
    name_en: p.name_en,
    ...(tr ? { name_tr: p.name_tr } : {}),
    description_ar: p.description_ar,
    category: categoryAr,
    price_tl: price.current,
    ...(price.old != null ? { original_price_tl: price.old } : {}),
  };
  if (p.product_quantities.length) brief.quantity_options = p.product_quantities.map((q) => `${q.label_ar} — ${q.price} TL`);
  if (p.product_sizes.length) brief.sizes = p.product_sizes.map((s) => s.label);
  if (p.product_colors.length) brief.colors = p.product_colors.map((c) => c.label_ar);
  return JSON.stringify(brief);
}

export interface PromptInput {
  product: ProductRecord;
  categoryAr: string;
  angle: Angle;
  languages: string[];
  mode: CaptionMode;
  /** The last ~10 headlines for this product/angle — hints only; duplicates are checked in code. */
  avoid?: string[];
  /** Why the previous attempt was rejected (real failures only). */
  hint?: string;
  /** `turkish` mode: the existing Arabic opening line, so the Turkish paragraph matches it. */
  arabicHook?: string;
}

/** The variable tail of the prompt — everything before it (FIXED_INSTRUCTIONS) is identical across calls so it is served from the prompt cache. */
export function variablePart(i: PromptInput): string {
  const tr = i.languages.includes("tr");
  return [
    `الوضع: ${i.mode}`,
    `الزاوية: ${i.angle}`,
    `التركية: ${tr ? "مطلوبة" : 'غير مطلوبة (caption_tr = "")'}`,
    `بيانات المنتج: ${productBrief(i.product, i.categoryAr, i.languages)}`,
    i.arabicHook ? `الافتتاحية العربية الحالية: ${i.arabicHook}` : "",
    i.avoid?.length ? `عناوين استُخدمت سابقًا لهذا المنتج/الزاوية — لا تكرّرها ولا تقترب منها:\n${i.avoid.map((r) => "- " + r).join("\n")}` : "",
    i.hint ? `تنبيه من المحاولة السابقة: ${i.hint}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

let reasoningOk: boolean | null = null;
const REASONING_EFFORT = () => process.env.OPENAI_REASONING_EFFORT || "low";
export const MAX_OUTPUT: Record<CaptionMode, number> = { full: 5000, design: 1500, turkish: 1500 };

/** Body of one Responses API request (also used as the body of a Batch API line). Fixed prefix first, cache key shared by every call. */
export function requestBody(i: PromptInput, opts: { reasoning?: boolean } = {}): Record<string, unknown> {
  const reasoning = opts.reasoning ?? reasoningOk !== false;
  return {
    model: process.env.OPENAI_MODEL || "gpt-6.1-sol",
    input: [
      { role: "system", content: FIXED_INSTRUCTIONS },
      { role: "user", content: variablePart(i) },
    ],
    text: { format: { type: "json_schema", name: "hattah_caption", schema: JSON_SCHEMA, strict: true } },
    prompt_cache_key: "hattah-caption-v2",
    max_output_tokens: MAX_OUTPUT[i.mode],
    ...(reasoning ? { reasoning: { effort: REASONING_EFFORT() } } : {}),
  };
}

/* ───────────── usage + cost accounting ───────────── */
export interface UsageRecord {
  label: string;
  input: number;
  cached: number;
  output: number;
  reasoning: number;
  cost: number;
  batch: boolean;
}
export const usageLog: UsageRecord[] = [];
// USD per 1M tokens (gpt-6.1-sol list price); override with OPENAI_PRICE_IN / OPENAI_PRICE_CACHED / OPENAI_PRICE_OUT.
const PRICE = () => ({
  in: Number(process.env.OPENAI_PRICE_IN ?? 2),
  cached: Number(process.env.OPENAI_PRICE_CACHED ?? 0.1),
  out: Number(process.env.OPENAI_PRICE_OUT ?? 10),
});
export function recordUsage(label: string, usage: any, batch = false): UsageRecord {
  const input = usage?.input_tokens ?? 0;
  const cached = usage?.input_tokens_details?.cached_tokens ?? 0;
  const output = usage?.output_tokens ?? 0;
  const reasoning = usage?.output_tokens_details?.reasoning_tokens ?? 0;
  const pr = PRICE();
  const cost = ((input - cached) * pr.in + cached * pr.cached + output * pr.out) / 1e6 * (batch ? 0.5 : 1);
  const rec = { label, input, cached, output, reasoning, cost, batch };
  usageLog.push(rec);
  log(`openai ${label}: in ${input} (cached ${cached}) out ${output} (reasoning ${reasoning}) ≈ $${cost.toFixed(5)}${batch ? " [batch -50%]" : ""}`);
  return rec;
}

/** One normal (synchronous) call. Drops `reasoning` once if the model rejects it. */
export async function callModel(i: PromptInput, label: string): Promise<CaptionJson> {
  const client = new OpenAI({ apiKey: need("OPENAI_API_KEY"), timeout: 180_000, maxRetries: 1 });
  let res;
  try {
    res = await client.responses.create(requestBody(i) as any);
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (reasoningOk !== false && /reasoning/i.test(msg) && /(unsupported|not supported|unknown|invalid)/i.test(msg)) {
      log("model rejects reasoning.effort → continuing without it:", msg.slice(0, 120));
      reasoningOk = false;
      res = await client.responses.create(requestBody(i, { reasoning: false }) as any);
    } else throw e;
  }
  if (reasoningOk === null) reasoningOk = true;
  recordUsage(label, (res as any).usage);
  if ((res as any).status === "incomplete") throw new Error(`model output cut off (${(res as any).incomplete_details?.reason ?? "incomplete"})`);
  return CaptionSchema.parse(JSON.parse((res as any).output_text));
}

/** Whether the configured model accepts `reasoning.effort` (probed once with a tiny call; used before building a batch). */
export async function supportsReasoning(): Promise<boolean> {
  if (reasoningOk !== null) return reasoningOk;
  const client = new OpenAI({ apiKey: need("OPENAI_API_KEY"), timeout: 60_000, maxRetries: 1 });
  try {
    await client.responses.create({ model: process.env.OPENAI_MODEL || "gpt-6.1-sol", input: "ok", reasoning: { effort: REASONING_EFFORT() }, max_output_tokens: 64 } as any);
    reasoningOk = true;
  } catch (e) {
    log("reasoning.effort probe failed:", (e as Error).message.slice(0, 120));
    reasoningOk = false;
  }
  return reasoningOk;
}
export const parseModelText = (text: string): CaptionJson => CaptionSchema.parse(JSON.parse(text));

/* ───────────── repair (in code) and validation (only real failures cost another call) ───────────── */

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const latinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Cuts text to `max` words, preferring the last clause boundary inside the limit and never ending on a connector. */
function clampWords(text: string, max: number): string {
  const ws = text.split(/\s+/).filter(Boolean);
  if (ws.length <= max) return text;
  let cut = ws.slice(0, max);
  let boundary = -1;
  cut.forEach((w, i) => {
    if (/[،,.؛:!؟?]$/.test(w)) boundary = i;
  });
  if (boundary >= Math.floor(max / 2)) cut = cut.slice(0, boundary + 1);
  while (cut.length > 2 && /^(و|في|من|إلى|على|عن|مع|لـ?|ب|ك|أو|إن|أن)$/.test(cut[cut.length - 1].replace(/[،,.؛:!؟?]$/, ""))) cut.pop();
  return cut.join(" ").replace(/[،,؛:]$/, "");
}

const CURRENCY = /(ليرة|₺|\bTL\b)/i;
/** On-image text must not mention a price: drop the clause that does when enough words remain (otherwise validation rejects it). */
function dropPriceClause(text: string, minWords: number): string {
  if (!CURRENCY.test(text)) return text;
  const kept = text.split(/(?<=[،,؛:])\s+|\s[–—-]\s/).filter((c) => !CURRENCY.test(c));
  const out = kept.join(" ").replace(/[،,؛:]\s*$/, "").trim();
  return out.split(/\s+/).filter(Boolean).length >= minWords ? out : text;
}

/** Fixes what is safely fixable without the model: whitespace, Arabic-Indic digits in the subline, over-long headline/subline, surplus
 * paragraphs/lines, over-long body, hashtag shape. */
export function repair(raw: CaptionJson, mode: CaptionMode, withTr: boolean): CaptionJson {
  const c: CaptionJson = {
    caption_hook: clean(raw.caption_hook),
    caption_story: raw.caption_story.map(clean).filter(Boolean).slice(0, 3),
    caption_details: raw.caption_details.map(clean).filter(Boolean).slice(0, 5),
    caption_en: clean(raw.caption_en),
    caption_tr: withTr ? clean(raw.caption_tr) : "",
    hashtags: [...new Set(raw.hashtags.map((h) => "#" + clean(h).replace(/^#+/, "").replace(/\s+/g, "_")).filter((h) => h.length > 2))].slice(0, 12),
    image_headline: clampWords(dropPriceClause(clean(raw.image_headline), 2), 6),
    image_subline: clampWords(dropPriceClause(latinDigits(clean(raw.image_subline)), 4), 15),
  };
  if (mode === "design") return { ...c, caption_hook: "", caption_story: [], caption_details: [], caption_en: "", caption_tr: "", hashtags: [] };
  if (mode === "turkish") return { ...c, caption_hook: "", caption_story: [], caption_details: [], caption_en: "", hashtags: [] };
  // over-long body: drop trailing detail lines (keep 2), then trailing sentences of the last story paragraph
  const over = () => captionBody(c, false).length > BODY_MAX;
  while (over() && c.caption_details.length > 2) c.caption_details.pop();
  while (over() && c.caption_story.length) {
    const last = c.caption_story[c.caption_story.length - 1];
    const sentences = last.split(/(?<=[.!؟?])\s+/);
    if (sentences.length > 1) c.caption_story[c.caption_story.length - 1] = sentences.slice(0, -1).join(" ");
    else if (c.caption_story.length > 2) c.caption_story.pop();
    else break;
  }
  return c;
}

/** Real failures only (these are the only reasons to call the model again). */
export function validate(c: CaptionJson, mode: CaptionMode, p: ProductRecord, withTr: boolean): string | null {
  if (mode === "turkish") return c.caption_tr.trim().length >= 80 ? null : "Turkish paragraph is missing or too short";
  const wc = (v: string) => v.trim().split(/\s+/).filter(Boolean).length;
  const head = c.image_headline, sub = c.image_subline;
  if (wc(head) < 2) return "headline must be 2–6 words";
  if (wc(sub) < 4) return "subline must be 4–15 words";
  if (/[0-9٠-٩]/.test(head)) return "headline contains digits";
  if (/(ليرة|₺|\bTL\b)/i.test(head + " " + sub)) return "text mentions price/currency";
  const nameTokens = normalizeText(p.name_ar).split(" ").filter((t) => t.length > 2);
  const subN = normalizeText(sub);
  if (nameTokens.length >= 3 && nameTokens.filter((t) => subN.includes(t)).length / nameTokens.length >= 0.6) return "subline restates the product name";
  if (mode === "full") {
    if (c.caption_hook.length < 10 || c.caption_story.length < 2 || c.caption_details.length < 2 || c.caption_en.length < 10) return "caption is missing required parts";
    if (withTr && c.caption_tr.length < 60) return "Turkish paragraph is missing or too short";
    const len = captionBody(c, false).length;
    if (len < BODY_MIN) return `caption too short (${len} chars, need ${BODY_MIN}–${BODY_MAX})`;
  }
  return null;
}

/** Normalised-text duplicate check against the last 30 days: exact match or ≥ 80 % word overlap. */
export function makeDuplicateChecker(recentTexts: Iterable<string>) {
  const seen = [...recentTexts].map((t) => normalizeText(t)).filter(Boolean);
  const exact = new Set(seen);
  const sets = seen.map((t) => new Set(t.split(" ")));
  const near = (t: string) => {
    const a = new Set(t.split(" "));
    return sets.some((b) => {
      let inter = 0;
      for (const w of a) if (b.has(w)) inter++;
      return a.size >= 3 && inter / (a.size + b.size - inter) >= 0.8;
    });
  };
  return {
    isRepeat: (c: CaptionJson) => [c.image_headline, c.image_subline].map(normalizeText).some((t) => exact.has(t) || near(t)),
    add: (c: CaptionJson) => {
      for (const t of [c.image_headline, c.image_subline].map(normalizeText)) {
        exact.add(t);
        sets.push(new Set(t.split(" ")));
      }
    },
  };
}

// Placeholder image text used until an OpenAI key is configured, so previews
// and dry runs still show different text per product/angle.
const PLACEHOLDERS: Record<Angle, [string, string][]> = {
  showcase: [
    ["قطعة تشبهك وتشبه أصلك", "صُنعت بعناية لتبقى معك سنين طويلة"],
    ["لمسة فلسطينية في كل يوم", "تفاصيل أصيلة بتصميم عصري يناسب كل مناسبة"],
    ["هدية بطعم البلد", "اختيار مثالي لمن تحب ولبيتك أيضًا"],
    ["جديدة وأصيلة", "جودة تحسّها من أول نظرة وتفاصيل تحكي حكاية"],
    ["حكاية تُلبس وتُهدى", "قطعة مميزة تجمع التراث بروح اليوم"],
    ["من القلب إلى بيتك", "نختارها بحب ونوصلها لك بكل اهتمام"],
  ],
  heritage: [
    ["غرزة بغرزة تُحكى الحكاية", "كل خيط في التطريز الفلسطيني يحمل ذاكرة بيت وقرية"],
    ["إرث جدّاتنا", "حرفة توارثتها الأيدي الصبورة جيلًا بعد جيل"],
    ["ألوان الأرض", "من الزيتون والكوفية تستمد الحرفة ألوانها وتفاصيلها"],
    ["صنعة تحفظ الهوية", "نعتز بكل قطعة تحمل بصمة اليد الفلسطينية"],
    ["أصالة لا تبهت", "تراث يُصان بالحب ويصل إليك بحلة جديدة"],
    ["مطبخ الذاكرة", "نكهات البيت الفلسطيني كما عرفناها على سفرة العائلة"],
  ],
  quote: [
    ["ما صُنع بحب يبقى", "قطعة تحمل دفء اليد التي صنعتها"],
    ["البيت حيث القلب", "اجعل لتراثك مكانًا في كل ركن من بيتك"],
    ["الأصل لا يغيب", "حكاية الأرض تُروى بالتفاصيل الصغيرة"],
    ["بساطة تحكي الكثير", "تصميم هادئ يقول ما لا تقوله الكلمات"],
    ["أنا من هناك", "اعتزاز هادئ بالجذور في كل يوم"],
    ["الجمال في التفاصيل", "لأن الأشياء الصغيرة هي التي تبقى في الذاكرة"],
  ],
  offer: [
    ["فرصتك لتقتنيها", "جودة تستحق أن تكون في بيتك بسعر مناسب"],
    ["السعر واضح والجودة أوضح", "اطلبها اليوم عبر واتساب وتواصل معنا بسهولة"],
    ["اختيار موفّق", "قيمة حقيقية مقابل كل ليرة تدفعها"],
    ["جاهزة لتصلك", "اطلب الآن وسنجهّزها لك بكل عناية"],
    ["هدية تفرح القلب", "قطعة مميزة بسعر مدروس لكل الميزانيات"],
    ["لا تفوّتها", "الكميات محدودة والتفاصيل أجمل من الصور"],
  ],
};

function stub(p: ProductRecord, angle: Angle, salt = 0): CaptionJson {
  const hash = (seed: string) => [...(seed + p.id + angle + p.name_ar)].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const pool = PLACEHOLDERS[angle];
  // headline and subline are picked independently → 36 combinations per angle
  const headline = pool[(hash("h") + salt) % pool.length][0];
  const subline = pool[(hash("s") + salt) % pool.length][1];
  return {
    caption_hook: `${p.name_ar} — حكاية تبدأ من البيت. (نص تجريبي DRY_RUN)`,
    caption_story: [
      "كل قطعة عندنا تحمل ذاكرة وتراثًا، ويدًا صنعتها بحب وصبر حتى تصل إليك وتصير جزءًا من يومك.",
      "نختارها بعناية لأنها أكثر من منتج؛ هي لغة صغيرة نحكي بها عن الأصل والبيت والناس الطيبين.",
    ],
    caption_details: ["✨ تفصيل تجريبي أول", "🧵 تفصيل تجريبي ثانٍ"],
    caption_en: `${p.name_en} — a piece that carries Palestinian heritage. (dry-run text)`,
    caption_tr: "",
    hashtags: ["#حطة_ستور", "#صناعة_يدوية", "#هدايا_فلسطينية"],
    image_headline: headline,
    image_subline: subline,
  };
}

export function placeholderDesign(p: ProductRecord, angle: Angle, salt = 0): Required<DesignText> {
  const j = stub(p, angle, salt);
  return { headline: j.image_headline, subline: j.image_subline };
}

export interface CaptionResult {
  caption: string;
  design: Required<DesignText>;
  /** The emoji-led detail lines (reused on a carousel's details slide). */
  details: string[];
}

export function assembleCaption(c: CaptionJson, settings: SocialSettings, ctaIndex = 0, tagLine?: string[]): string {
  const body = captionBody(c, settings.caption_languages.includes("tr"));
  const cta = renderCta(ctaIndex, settings.store_url);
  // Required: Instagram-only captions must carry the store URL and the WhatsApp number.
  if (!cta.includes(siteDisplay(settings.store_url)) || !cta.includes(whatsappDisplay())) throw new Error("caption CTA is missing the store URL or WhatsApp number");

  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of tagLine ?? [...settings.hashtags_base.slice(0, 5), ...c.hashtags, ...settings.hashtags_base.slice(5)]) {
    const t = "#" + raw.replace(/^#+/, "").replace(/\s+/g, "_");
    if (t.length < 3 || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    tags.push(t);
    if (tags.length >= 10) break;
  }
  const build = () => `${body}\n\n${cta}\n\n${tags.join(" ")}`;
  let text = build();
  // Instagram's hard limit is 2,200 characters: drop hashtags from the end first.
  while (text.length > 2100 && tags.length > 5) {
    tags.pop();
    text = build();
  }
  return text;
}


export function resultFromJson(c: CaptionJson, settings: SocialSettings, ctaIndex: number, mode: CaptionMode, tagLine?: string[]): CaptionResult {
  return {
    caption: mode === "full" ? assembleCaption(c, settings, ctaIndex, tagLine) : "",
    design: { headline: c.image_headline.trim(), subline: c.image_subline.trim() },
    details: c.caption_details,
  };
}

/** Repair + validate + duplicate check for one model answer (shared by the sync path and the batch collector). `null` reason = accepted. */
export function checkCaptionJson(
  raw: CaptionJson,
  mode: CaptionMode,
  p: ProductRecord,
  settings: SocialSettings,
  dup: ReturnType<typeof makeDuplicateChecker>,
): { json: CaptionJson; reason: null } | { json: null; reason: string } {
  const withTr = settings.caption_languages.includes("tr");
  const json = repair(raw, mode, withTr);
  const reason = validate(json, mode, p, withTr) ?? (dup.isRepeat(json) ? "نص التصميم يكرر نصًا حديثًا (عنوان أو سطر فرعي)" : null);
  return reason ? { json: null, reason } : { json, reason: null };
}

export interface GenerateContext {
  mode: CaptionMode;
  /** The last ~10 headlines for this product/angle (prompt hints). */
  avoid: string[];
  /** Last 30 days of headlines/sublines — checked in code only, never sent. */
  recent: Iterable<string>;
  label?: string;
  /** Builds the day-unique hashtag line from the model's product-specific tags (3 big + 4 medium + 3 niche, ar/tr/en). */
  tagPicker?: (productTags: string[]) => Promise<string[]>;
}

/** Generates the on-image text (and for `full` mode the caption). Retries only for real failures (cut-off, too short, digits/price in the headline, repeated text). */
export async function generateCaption(
  p: ProductRecord,
  categoryAr: string,
  angle: Angle,
  settings: SocialSettings,
  ctx: GenerateContext,
  ctaIndex = 0,
): Promise<CaptionResult> {
  const dup = makeDuplicateChecker(ctx.recent);
  if (isDryRun() && !process.env.OPENAI_API_KEY) {
    log("DRY_RUN without OPENAI_API_KEY → using placeholder text");
    return resultFromJson(repair(stub(p, angle), ctx.mode, false), settings, ctaIndex, ctx.mode);
  }
  let hint = "";
  let lastReason = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    let raw: CaptionJson;
    try {
      raw = await callModel(
        { product: p, categoryAr, angle, languages: settings.caption_languages, mode: ctx.mode, avoid: ctx.avoid, hint },
        `${ctx.label ?? p.name_ar.slice(0, 24)} [${ctx.mode}${attempt > 1 ? ` retry ${attempt - 1}` : ""}]`,
      );
    } catch (e) {
      lastReason = (e as Error).message;
      log(`caption attempt ${attempt} failed:`, lastReason);
      if (attempt === 3) throw e;
      continue;
    }
    const checked = checkCaptionJson(raw, ctx.mode, p, settings, dup);
    if (checked.json) return resultFromJson(checked.json, settings, ctaIndex, ctx.mode, ctx.mode === "full" && ctx.tagPicker ? await ctx.tagPicker(checked.json.hashtags) : undefined);
    hint = checked.reason;
    lastReason = checked.reason;
    log(`attempt ${attempt}: ${checked.reason}, retrying`);
  }
  throw new Error(lastReason || "caption generation failed");
}

/** Turkish paragraph only (used to add the Turkish text to captions that already exist, without touching the rest). */
export async function generateTurkishParagraph(p: ProductRecord, categoryAr: string, angle: Angle, settings: SocialSettings, arabicHook: string): Promise<string> {
  let hint = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const raw = await callModel({ product: p, categoryAr, angle, languages: [...new Set([...settings.caption_languages, "tr"])], mode: "turkish", arabicHook, hint }, `turkish ${p.name_ar.slice(0, 20)}${attempt > 1 ? ` retry ${attempt - 1}` : ""}`);
    const json = repair(raw, "turkish", true);
    const reason = validate(json, "turkish", p, true);
    if (!reason) return json.caption_tr;
    hint = reason;
  }
  throw new Error("could not get a Turkish paragraph");
}
