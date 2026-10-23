import OpenAI from "openai";
import { z } from "zod";
import type { Angle, DesignText, ProductRecord, SocialSettings } from "./types.js";
import { effectivePrice } from "./products.js";
import { whatsappDisplay } from "./render/render.js";
import { isDryRun, need } from "./env.js";
import { log } from "./time.js";

const CaptionSchema = z.object({
  caption_ar: z.string().min(10),
  caption_en: z.string().min(5),
  caption_tr: z.string(),
  hashtags: z.array(z.string()).min(3).max(12),
  quote: z.string().min(5).max(110),
  heritage: z.string().min(10).max(170),
});
type CaptionJson = z.infer<typeof CaptionSchema>;

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["caption_ar", "caption_en", "caption_tr", "hashtags", "quote", "heritage"],
  properties: {
    caption_ar: { type: "string" },
    caption_en: { type: "string" },
    caption_tr: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    quote: { type: "string" },
    heritage: { type: "string" },
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

function stub(p: ProductRecord): CaptionJson {
  return {
    caption_ar: `${p.name_ar} — قطعة تحمل روح التراث الفلسطيني. (نص تجريبي DRY_RUN)`,
    caption_en: `${p.name_en} — a piece that carries Palestinian heritage. (dry-run text)`,
    caption_tr: "",
    hashtags: ["#حطة_ستور", "#صناعة_يدوية", "#هدايا_فلسطينية"],
    quote: "ما يُصنع باليد يبقى في القلب.",
    heritage: "كل قطعة تحمل حكاية ويدًا صنعتها بحب وصبر.",
  };
}

async function callModel(p: ProductRecord, categoryAr: string, angle: Angle, languages: string[]): Promise<CaptionJson> {
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
- quote: جملة قصيرة (حتى ٨٥ حرفًا) تُطبع على التصميم، إنسانية ودافئة وغير سياسية.
- heritage: جملة تراثية (حتى ١٤٠ حرفًا) تُطبع على التصميم عن الحرفة/التراث المرتبط بالمنتج، دون معلومات غير مؤكدة.`;

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
  design: DesignText;
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
): Promise<CaptionResult> {
  let json: CaptionJson;
  if (isDryRun() && !process.env.OPENAI_API_KEY) {
    log("DRY_RUN without OPENAI_API_KEY → using stub caption");
    json = stub(p);
  } else {
    try {
      json = await callModel(p, categoryAr, angle, settings.caption_languages);
    } catch (e) {
      log("caption attempt 1 failed, retrying once:", (e as Error).message);
      json = await callModel(p, categoryAr, angle, settings.caption_languages);
    }
  }
  return { caption: assembleCaption(json, settings), design: { quote: json.quote, heritage: json.heritage } };
}
