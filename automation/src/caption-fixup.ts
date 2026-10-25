// Adds the Turkish paragraph (before the English line) to existing, unpublished feed/reel/carousel captions WITHOUT rewriting the rest,
// and re-picks a day-unique hashtag set (3 big + 4 medium + 3 niche). Usage: tsx src/caption-fixup.ts --date=YYYY-MM-DD
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { slotToUtc, addDays, log } from "./time.js";
import { generateTurkishParagraph } from "./captions.js";
import { loadCategories, loadProduct, loadSettings, makeTagPicker } from "./pipeline.js";
import { parseTags } from "./hashtags.js";

loadEnv();
const date = process.argv.find((a) => a.startsWith("--date="))?.slice(7);
if (!date) throw new Error("--date=YYYY-MM-DD is required");
const sb = getSupabase();
const settings = await loadSettings(sb);
const cats = await loadCategories(sb);
const { data: rows, error } = await sb
  .from("social_posts")
  .select("id, post_type, angle, product_id, status, scheduled_at, caption_full")
  .in("post_type", ["feed", "reel", "carousel"])
  .in("status", ["draft", "approved"])
  .not("caption_full", "is", null)
  .gte("scheduled_at", slotToUtc(date, "00:00").toISOString())
  .lt("scheduled_at", slotToUtc(addDays(date, 1), "00:00").toISOString())
  .order("scheduled_at");
if (error) throw new Error(error.message);

const TR = /[çğıöşüÇĞİÖŞÜ]/;
const KNOWN = /(?:فلسطين|تراث|هدايا|handmade|Palestine|hediye|İstanbul|Türkiye|Istanbul)/;
let done = 0;
for (const r of rows ?? []) {
  const paras = (r.caption_full as string).split("\n\n");
  if (paras.length < 5 || !paras[paras.length - 1].trim().startsWith("#")) {
    log(`skip ${r.id}: unexpected caption layout`);
    continue;
  }
  const en = paras.length - 3; // …details, [TR], EN, CTA, tags
  const hasTr = TR.test(paras[en - 1] ?? "") && !/[؀-ۿ]/.test(paras[en - 1]);
  const product = await loadProduct(sb, r.product_id!);
  const categoryAr = cats.get(product.category)?.label_ar ?? "";
  if (!hasTr) {
    const tr = await generateTurkishParagraph(product, categoryAr, r.angle, settings, paras[0]);
    paras.splice(en, 0, tr);
  }
  // fresh tag set: keep the product-specific tags the caption already has (the ones that are not generic pool tags)
  const old = parseTags(r.caption_full);
  const productTags = old.filter((t) => !KNOWN.test(t) && !/حطة|Hattah/i.test(t));
  const tags = await makeTagPicker(sb, r.scheduled_at, r.id)(productTags);
  paras[paras.length - 1] = tags.join(" ");
  let text = paras.join("\n\n");
  while (text.length > 2150 && tags.length > 6) {
    tags.pop();
    paras[paras.length - 1] = tags.join(" ");
    text = paras.join("\n\n");
  }
  const { error: e } = await sb.from("social_posts").update({ caption_full: text }).eq("id", r.id).in("status", ["draft", "approved"]);
  if (e) throw new Error(e.message);
  log(`✓ ${r.post_type} ${r.scheduled_at.slice(11, 16)}Z ${hasTr ? "(had Turkish)" : "+Turkish"} | ${text.length} chars | ${tags.join(" ")}`);
  done++;
}
log(`done: ${done} caption(s) updated`);
process.exit(0);
