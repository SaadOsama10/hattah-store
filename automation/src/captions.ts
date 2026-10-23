import OpenAI from "openai";
import { z } from "zod";
import type { Angle, DesignText, ProductRecord, SocialSettings } from "./types.js";
import { effectivePrice } from "./products.js";
import { whatsappDisplay } from "./render/render.js";
import { isDryRun, need } from "./env.js";
import { log } from "./time.js";

const wordCount = (v: string) => v.trim().split(/\s+/).filter(Boolean).length;
export const normalizeText = (v: string) =>
  v.replace(/[\u064B-\u0652\u0640]/g, "").replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim().toLowerCase();

const CaptionSchema = z.object({
  caption_ar: z.string().min(10),
  caption_en: z.string().min(5),
  caption_tr: z.string(),
  hashtags: z.array(z.string()).min(3).max(12),
  image_headline: z.string().refine((v) => wordCount(v) >= 2 && wordCount(v) <= 6, "headline must be 2–6 words"),
  image_subline: z.string().refine((v) => wordCount(v) >= 4 && wordCount(v) <= 15, "subline must be 4–15 words"),
});
type CaptionJson = z.infer<typeof CaptionSchema>;

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["caption_ar", "caption_en", "caption_tr", "hashtags", "image_headline", "image_subline"],
  properties: {
    caption_ar: { type: "string" },
    caption_en: { type: "string" },
    caption_tr: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    image_headline: { type: "string" },
    image_subline: { type: "string" },
  },
} as const;

const ANGLE_BRIEF: Record<Angle, string> = {
  showcase: "عرض المنتج: صِف المنتج وما يميّزه (الخامة، التطريز، الاستخدام) بدفء وبساطة.",
  heritage: "حكاية الحرفة والتراث: اربط المنتج بالحرفة الفلسطينية (التطريز، الكوفية، المطبخ الفلسطيني…) دون ادّعاء معلومات غير مؤكدة.",
  quote: "أسلوب اقتباس: ابدأ بجملة قصيرة مؤثرة وإنسانية (ليست شعارًا سياسيًا) ثم اربطها بالمنتج.",
  offer: "التركيز على السعر والقيمة: اذكر السعر بوضوح، وإن وُجد خصم فاذكره، دون ضغط بيعي.",
};

const SYSTEM = `أنت كاتب محتوى لعلامة "حَطّة" (HATTAH)، متجر في إسطنبول يبيع منتجات تراثية فلسطينية/غزّية: هوديات، تطريز، لوحات، ميداليات، أكلات منزلية.
الصوت: دافئ، فخور، أصيل، بلهجة شامية/فلسطينية بيضاء قريبة، قصير وإنساني، غير بيعي.
ممنوع: ادّعاءات غير حقيقية (جودة/مواد/توصيل/شحن/كميات/خصومات غير مذكورة في البيانات)، شعارات أو مواقف سياسية، كلمات قد تعرّض الحساب للحظر على Meta (حرب، قتل، مقاومة، ...)، الإيموجي الكثير (٢ كحد أقصى).
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
    caption_ar: `${p.name_ar} — قطعة تحمل روح التراث الفلسطيني. (نص تجريبي DRY_RUN)`,
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

async function callModel(p: ProductRecord, categoryAr: string, angle: Angle, languages: string[], recent: string[]): Promise<CaptionJson> {
  const client = new OpenAI({ apiKey: need("OPENAI_API_KEY") });
  const model = process.env.OPENAI_MODEL || "gpt-6.1-sol";
  const user = `زاوية المنشور: ${angle} — ${ANGLE_BRIEF[angle]}

بيانات المنتج:
${productBrief(p, categoryAr)}

المطلوب (JSON):
- caption_ar: كابشن بالعربية (٢–٤ جمل قصيرة، حتى ٦٠٠ حرف). لا تضع رقم الواتساب ولا الهاشتاغات فيه (تُضاف تلقائيًا).
- caption_en: سطر أو سطران بالإنجليزية فقط (حتى ٢٠٠ حرف).
- caption_tr: ${languages.includes("tr") ? "سطر بالتركية (حتى ٢٠٠ حرف)" : 'اتركه "" لأن التركية غير مطلوبة'}.
- hashtags: ٤–٦ وسوم خاصة بهذا المنتج (بدون تكرار)، كل وسم يبدأ بـ # وبدون مسافات.
- image_headline: من ٢ إلى ٦ كلمات بالضبط كحد أقصى ٦، بلهجة شامية دافئة. ${IMAGE_TEXT_BRIEF[angle]}
- image_subline: من ٤ إلى ١٥ كلمة كحد أقصى ١٥. نص التصميم قصير وبدون هاشتاغات أو أرقام هاتف أو أسعار.
${recent.length ? `\nنصوص استُخدمت في آخر ٣٠ يومًا — ممنوع تكرار أي عنوان أو جملة منها أو الاقتراب منها في الصياغة:\n${recent.map((r) => "- " + r).join("\n")}` : ""}`;

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
  const wa = whatsappDisplay();
  const parts = [c.caption_ar.trim(), c.caption_en.trim()];
  if (settings.caption_languages.includes("tr") && c.caption_tr.trim()) parts.push(c.caption_tr.trim());
  parts.push(`📲 للطلب عبر واتساب | Order via WhatsApp: ${wa}`);

  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of [...settings.hashtags_base.slice(0, 5), ...c.hashtags, ...settings.hashtags_base.slice(5)]) {
    const t = "#" + raw.replace(/^#+/, "").replace(/\s+/g, "_");
    if (t.length < 3 || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    tags.push(t);
    if (tags.length >= 10) break;
  }
  let text = parts.join("\n\n") + "\n\n" + tags.join(" ");
  // Hard cap ~1,200 chars: drop hashtags from the end first.
  while (text.length > 1200 && tags.length > 5) {
    tags.pop();
    text = parts.join("\n\n") + "\n\n" + tags.join(" ");
  }
  return text.slice(0, 1250);
}

/** Generates caption + on-image copy. Validates the JSON and retries once. */
export async function generateCaption(
  p: ProductRecord,
  categoryAr: string,
  angle: Angle,
  settings: SocialSettings,
  recentTexts: string[] = [],
): Promise<CaptionResult> {
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
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        json = await callModel(p, categoryAr, angle, settings.caption_languages, recentTexts);
      } catch (e) {
        log(`caption attempt ${attempt} failed:`, (e as Error).message);
        if (attempt === 3) throw e;
        continue;
      }
      if (!isRepeat(json)) break;
      log(`attempt ${attempt}: image text repeats a recent post, retrying`);
      if (attempt === 3) throw new Error("model kept repeating a headline used in the last 30 days");
    }
  }
  return { caption: assembleCaption(json, settings), design: { headline: json.image_headline.trim(), subline: json.image_subline.trim() } };
}
