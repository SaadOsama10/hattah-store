import OpenAI from "openai";
import { z } from "zod";
import type { Angle, DesignText, ProductRecord, SocialSettings } from "./types.js";
import { effectivePrice } from "./products.js";
import { siteDisplay, whatsappDisplay } from "./render/render.js";
import { isDryRun, need } from "./env.js";
import { log } from "./time.js";

const wordCount = (v: string) => v.trim().split(/\s+/).filter(Boolean).length;
export const normalizeText = (v: string) =>
  v.replace(/[\u064B-\u0652\u0640]/g, "").replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim().toLowerCase();

export const BODY_MIN = 600;
export const BODY_MAX = 1000;

const CaptionSchema = z.object({
  caption_hook: z.string().min(10),
  caption_story: z.array(z.string().min(20)).min(2).max(3),
  caption_details: z.array(z.string().min(5)).min(2).max(6),
  caption_en: z.string().min(10),
  caption_tr: z.string(),
  hashtags: z.array(z.string()).min(3).max(12),
  image_headline: z.string().refine((v) => wordCount(v) >= 2 && wordCount(v) <= 6, "headline must be 2–6 words"),
  image_subline: z.string().refine((v) => wordCount(v) >= 4 && wordCount(v) <= 15, "subline must be 4–15 words"),
});
type CaptionJson = z.infer<typeof CaptionSchema>;

const JSON_SCHEMA = {
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

/** The caption text before the CTA and hashtags (what the length rule measures). */
export function captionBody(c: CaptionJson, includeTr = false): string {
  return [
    c.caption_hook.trim(),
    ...c.caption_story.map((x) => x.trim()),
    c.caption_details.map((x) => x.trim()).join("\n"),
    c.caption_en.trim(),
    ...(includeTr && c.caption_tr.trim() ? [c.caption_tr.trim()] : []),
  ].join("\n\n");
}

const ANGLE_BRIEF: Record<Angle, string> = {
  showcase: "عرض المنتج: صِف المنتج وما يميّزه (الخامة، التطريز، الاستخدام) بدفء وبساطة.",
  heritage: "حكاية الحرفة والتراث: اربط المنتج بالحرفة الفلسطينية (التطريز، الكوفية، المطبخ الفلسطيني…) دون ادّعاء معلومات غير مؤكدة.",
  quote: "أسلوب اقتباس: ابدأ بجملة قصيرة مؤثرة وإنسانية (ليست شعارًا سياسيًا) ثم اربطها بالمنتج.",
  offer: "التركيز على السعر والقيمة: اذكر السعر بوضوح، وإن وُجد خصم فاذكره، دون ضغط بيعي.",
};

const SYSTEM = `أنت كاتب محتوى لعلامة "حَطّة" (HATTAH)، متجر في إسطنبول يبيع منتجات تراثية فلسطينية/غزّية: هوديات، تطريز، لوحات، ميداليات، أكلات منزلية.
الصوت: دافئ، فخور، أصيل، بلهجة شامية/فلسطينية بيضاء قريبة، إنساني وغير بيعي. افتتاحياتك متنوعة وحيّة ولا تبدأ أبدًا بعبارات عامة مثل «منتج رائع» أو «اكتشف».
ممنوع: ادّعاءات غير حقيقية (جودة/مواد/توصيل/شحن/كميات/خصومات غير مذكورة في البيانات)، شعارات أو مواقف سياسية، كلمات قد تعرّض الحساب للحظر على Meta (حرب، قتل، مقاومة، ...)، الإيموجي: لا تضع إيموجي في الجمل السردية؛ في سطور التفاصيل فقط إيموجي واحد أنيق في بداية كل سطر.
اكتب فقط من بيانات المنتج المعطاة، ولا تخترع تفاصيل.
المخرجات JSON فقط.`;

const IMAGE_TEXT_BRIEF: Record<Angle, string> = {
  showcase: "image_headline: عنوان جذّاب قصير يصف المنتج أو الإحساس به. image_subline: جملة تعرّف بما يميّزه (خامة/تطريز/استخدام).",
  heritage: "image_headline: عنوان عن الحرفة أو التراث المرتبط بالمنتج. image_subline: جملة قصيرة عن الحكاية/الحرفة (بدون معلومات غير مؤكدة).",
  quote: "image_headline: جملة اقتباس قصيرة مؤثرة وإنسانية (ليست شعارًا سياسيًا) تُطبع بخط كبير. image_subline: تكملة قصيرة تربطها بالمنتج.",
  offer: "image_headline: عنوان قصير يلفت للسعر/الفرصة بدون ضغط بيعي (لا تذكر خصمًا غير موجود في البيانات). image_subline: جملة تذكّر بقيمة المنتج.",
};

function productBrief(p: ProductRecord, categoryAr: string): string {
  const price = effectivePrice(p);
  return JSON.stringify(
    {
      name: { ar: p.name_ar, en: p.name_en, tr: p.name_tr },
      description: { ar: p.description_ar, en: p.description_en, tr: p.description_tr },
      category: categoryAr,
      price_tl: price.current,
      original_price_tl: price.old,
      quantity_options: p.product_quantities.map((q) => ({ ar: q.label_ar, en: q.label_en, price_tl: q.price })),
      sizes: p.product_sizes.map((s) => s.label),
      colors: p.product_colors.map((c) => ({ ar: c.label_ar, en: c.label_en })),
    },
    null,
    1,
  );
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

async function callModel(p: ProductRecord, categoryAr: string, angle: Angle, languages: string[], recent: string[], hint = ""): Promise<CaptionJson> {
  const client = new OpenAI({ apiKey: need("OPENAI_API_KEY"), timeout: 180_000, maxRetries: 1 });
  const model = process.env.OPENAI_MODEL || "gpt-6.1-sol";
  const user = `زاوية المنشور: ${angle} — ${ANGLE_BRIEF[angle]}

بيانات المنتج:
${productBrief(p, categoryAr)}

المطلوب (JSON):
- caption_hook: سطر افتتاحي عاطفي قوي واحد (جملة واحدة، لا يشبه الافتتاحيات العامة)، بلهجة شامية دافئة.
- caption_story: فقرتان أو ثلاث فقرات قصيرة (٢–٣ جمل لكل فقرة) تحكي القصة والمعنى وراء المنتج: التراث، الحرفة، الرمز، البيت والذاكرة الفلسطينية — اعتمد فقط على ما يدعمه وصف المنتج وما هو معروف عن الحرفة دون ادّعاءات أو معلومات مخترعة.
- caption_details: ٢–٥ سطور قصيرة نظيفة لتفاصيل المنتج الفعلية من البيانات (الخامة، المقاسات، الألوان، الاستخدام، والسعر إن كان مناسبًا ويوجد خصم حقيقي)، كل سطر يبدأ بإيموجي أنيق مناسب.
- مجموع طول (hook + story + details + english) يجب أن يكون بين ${BODY_MIN} و${BODY_MAX} حرفًا بالضبط تقريبًا — لا أقل ولا أكثر. لا تضع رقم الواتساب ولا رابط المتجر ولا الهاشتاغات فيها (تُضاف تلقائيًا).
- caption_en: سطر أو سطران بالإنجليزية كملخص قصير (حتى ٢٢٠ حرفًا).
- caption_tr: ${languages.includes("tr") ? "سطر بالتركية (حتى ٢٠٠ حرف)" : 'اتركه "" لأن التركية غير مطلوبة'}.
- hashtags: ٤–٦ وسوم خاصة بهذا المنتج (بدون تكرار)، كل وسم يبدأ بـ # وبدون مسافات.
- image_headline: من ٢ إلى ٦ كلمات بالضبط كحد أقصى ٦، بلهجة شامية دافئة. ${IMAGE_TEXT_BRIEF[angle]}
- image_subline: من ٤ إلى ١٥ كلمة كحد أقصى ١٥. نص التصميم قصير وبدون هاشتاغات أو أرقام هاتف.
- قواعد صارمة لنص التصميم (العنوان والسطر الفرعي): ممنوع ذكر الأسعار أو العملة (ليرة/TL) أو أي أرقام في العنوان؛ ممنوع تكرار اسم المنتج أو إعادة صياغته في السطر الفرعي (اسم المنتج يظهر على التصميم أصلًا) — قدّم معلومة جديدة عنه؛ استخدم الأرقام اللاتينية (0-9) إن لزم رقم في السطر الفرعي.
${hint ? `\nتنبيه من المحاولة السابقة: ${hint}\n` : ""}${recent.length ? `\nنصوص استُخدمت في آخر ٣٠ يومًا — ممنوع تكرار أي عنوان أو جملة منها أو الاقتراب منها في الصياغة:\n${recent.map((r) => "- " + r).join("\n")}` : ""}`;

  const res = await client.responses.create({
    model,
    input: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    text: { format: { type: "json_schema", name: "hattah_caption", schema: JSON_SCHEMA as any, strict: true } },
  });
  return CaptionSchema.parse(JSON.parse(res.output_text));
}

export interface CaptionResult {
  caption: string;
  design: Required<DesignText>;
}

export function assembleCaption(c: CaptionJson, settings: SocialSettings): string {
  const body = captionBody(c, settings.caption_languages.includes("tr"));
  const cta = `اطلب من المتجر: ${siteDisplay()}\nأو عبر واتساب: ${whatsappDisplay()}`;

  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of [...settings.hashtags_base.slice(0, 5), ...c.hashtags, ...settings.hashtags_base.slice(5)]) {
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

/** Generates caption + on-image copy. Validates the JSON and retries once. */
export async function generateCaption(
  p: ProductRecord,
  categoryAr: string,
  angle: Angle,
  settings: SocialSettings,
  recentTexts: string[] = [],
): Promise<CaptionResult> {
  const nameTokens = normalizeText(p.name_ar).split(" ").filter((t) => t.length > 2);
  /** Rules the model was told but may break: prices/digits in text, or a subline that just restates the product name. */
  const breaksRules = (j: CaptionJson): string | null => {
    const len = captionBody(j, settings.caption_languages.includes("tr")).length;
    if (len < BODY_MIN) return `caption too short (${len} chars, need ${BODY_MIN}–${BODY_MAX})`;
    if (len > BODY_MAX) return `caption too long (${len} chars, need ${BODY_MIN}–${BODY_MAX})`;
    const head = j.image_headline, sub = j.image_subline;
    if (/[0-9٠-٩]/.test(head)) return "headline contains digits";
    if (/(ليرة|₺|\bTL\b)/i.test(head + " " + sub)) return "text mentions price/currency";
    if (/[٠-٩]/.test(sub)) return "subline uses Arabic-Indic digits";
    const subN = normalizeText(sub);
    const overlap = nameTokens.filter((t) => subN.includes(t)).length;
    if (nameTokens.length >= 3 && overlap / nameTokens.length >= 0.6) return "subline restates the product name";
    return null;
  };
  const recentSet = new Set(recentTexts.map(normalizeText));
  const isRepeat = (j: CaptionJson) =>
    recentSet.has(normalizeText(j.image_headline)) || recentSet.has(normalizeText(j.image_subline));
  let json: CaptionJson;
  if (isDryRun() && !process.env.OPENAI_API_KEY) {
    log("DRY_RUN without OPENAI_API_KEY → using placeholder text");
    json = stub(p, angle);
  } else {
    // One retry for invalid JSON / limits, and up to 3 tries to avoid repeating
    // a headline or subline used in the last 30 days.
    json = null as unknown as CaptionJson;
    let hint = "";
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        json = await callModel(p, categoryAr, angle, settings.caption_languages, recentTexts, hint);
      } catch (e) {
        log(`caption attempt ${attempt} failed:`, (e as Error).message);
        if (attempt === 3) throw e;
        continue;
      }
      const broken = breaksRules(json);
      if (!isRepeat(json) && !broken) break;
      hint = broken ?? "نص التصميم يكرر نصًا حديثًا";
      log(`attempt ${attempt}: ${hint}, retrying`);
      if (attempt === 3) throw new Error(broken ?? "model kept repeating a headline used in the last 30 days");
    }
  }
  return { caption: assembleCaption(json, settings), design: { headline: json.image_headline.trim(), subline: json.image_subline.trim() } };
}
