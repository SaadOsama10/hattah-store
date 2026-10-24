// Suggests better product descriptions for products whose text is short in any language.
// Suggestions are saved as DRAFTS (product_description_drafts) — nothing is replaced until an
// admin approves it in /admin/seo. Usage: tsx src/descriptions.ts [--min=250]
import OpenAI from "openai";
import { z } from "zod";
import { loadEnv, need } from "./env.js";
import { getSupabase } from "./db.js";
import { log } from "./time.js";

loadEnv();
const min = Number(process.argv.find((a) => a.startsWith("--min="))?.slice(6) ?? 250);
const sb = getSupabase();
const client = new OpenAI({ apiKey: need("OPENAI_API_KEY"), timeout: 180_000, maxRetries: 1 });
const model = process.env.OPENAI_MODEL || "gpt-6.1-sol";
const LANG_NAME = { ar: "Arabic (warm Levantine-friendly Modern Standard)", en: "English", tr: "Turkish" } as const;
type Lang = keyof typeof LANG_NAME;

const Out = z.object({ description: z.string().min(min).max(1400) });

const { data: products, error } = await sb
  .from("products")
  .select("id,name_ar,name_en,name_tr,description_ar,description_en,description_tr,price,category,product_sizes(label),product_colors(label_en)");
if (error) throw new Error(error.message);

let made = 0;
for (const p of products ?? []) {
  for (const lang of ["ar", "en", "tr"] as Lang[]) {
    const current = String(p[`description_${lang}` as const] ?? "").trim();
    if (current.length >= min) continue;

    const { data: existing } = await sb.from("product_description_drafts").select("id").eq("product_id", p.id).eq("lang", lang).eq("status", "draft").maybeSingle();
    if (existing) continue;

    const prompt = `اكتب وصف منتج لمتجر "حَطّة" (HATTAH) في إسطنبول (تراث فلسطيني) باللغة: ${LANG_NAME[lang]}.
النبرة: دافئة، أصيلة، فخورة، غير بيعية. 2–3 فقرات قصيرة ثم سطور تفاصيل. بين ${min} و1000 حرف.
ممنوع: ادعاءات غير موجودة في البيانات (مواد/توصيل/كميات/خصومات)، شعارات سياسية.
اعتمد فقط على البيانات التالية:
${JSON.stringify({
  name: { ar: p.name_ar, en: p.name_en, tr: p.name_tr },
  existing_descriptions: { ar: p.description_ar, en: p.description_en, tr: p.description_tr },
  price_try: p.price,
  sizes: (p.product_sizes as { label: string }[]).map((s) => s.label),
  colors: (p.product_colors as { label_en: string }[]).map((c) => c.label_en),
})}
أعد JSON: {"description": "..."}`;

    try {
      const res = await client.responses.create({
        model,
        input: [{ role: "user", content: prompt }],
        text: {
          format: {
            type: "json_schema",
            name: "description",
            strict: true,
            schema: { type: "object", additionalProperties: false, required: ["description"], properties: { description: { type: "string" } } },
          },
        },
      });
      const { description } = Out.parse(JSON.parse(res.output_text));
      const { error: insErr } = await sb.from("product_description_drafts").insert({
        product_id: p.id,
        lang,
        current_text: current,
        suggested_text: description.trim(),
      });
      if (insErr) throw new Error(insErr.message);
      made++;
      log(`draft saved: ${p.name_en.slice(0, 40)} [${lang}] (${current.length} → ${description.length} chars)`);
    } catch (e) {
      log(`✗ ${p.name_en.slice(0, 40)} [${lang}]: ${(e as Error).message}`);
    }
  }
}
log(`done: ${made} draft(s) created`);
process.exit(0);
