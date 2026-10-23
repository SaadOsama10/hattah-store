// Renders one sample of every template/format with real products → ./previews
import { mkdirSync, writeFileSync } from "node:fs";
import { Renderer } from "./render/render.js";
import { ANGLES } from "./types.js";
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { effectivePrice, categoryLabelAr, sortedImages } from "./products.js";

loadEnv();
const sb = getSupabase();
const { data: products } = await sb
  .from("products")
  .select("*, product_images(image_url, sort_order), product_quantities(label_ar,label_en,price)")
  .order("created_at", { ascending: false })
  .limit(200);
const { data: cats } = await sb.from("categories").select("key,label_ar");
const catMap = new Map((cats ?? []).map((c) => [c.key as string, c.label_ar as string]));

const pick = (pred: (p: any) => boolean, i = 0) => (products ?? []).filter(pred)[i];
// Include the longest Arabic name to stress-test auto-shrink, plus a short one.
const byLen = [...(products ?? [])].sort((a, b) => b.name_ar.length - a.name_ar.length);
const samples = [byLen[0], pick((p) => p.category.includes("wall"), 0), pick((p) => p.category === "brain-games"), byLen[byLen.length - 1]];

mkdirSync("previews", { recursive: true });
const r = new Renderer();
let n = 0;
for (const type of ["feed", "story"] as const) {
  for (const [i, angle] of ANGLES.entries()) {
    const p = samples[(i + (type === "story" ? 1 : 0)) % samples.length];
    const price = effectivePrice(p);
    const buf = await r.render({
      type,
      angle,
      nameAr: p.name_ar,
      categoryAr: categoryLabelAr(catMap, p.category),
      price: angle === "offer" && i === 3 ? Math.round(price.current * 0.85) : price.current,
      oldPrice: angle === "offer" && i === 3 ? price.current : price.old,
      photoUrl: sortedImages(p)[0],
      text: {
        quote: "ما يُصنع باليد يبقى في القلب، وما يُلبس بحب يحكي حكاية أرض.",
        heritage: "التطريز الفلسطيني لغة بين النساء، كل غرزة فيها ذاكرة وكل لون فيه بيت وقرية.",
      },
    });
    writeFileSync(`previews/${type}-${angle}.jpg`, buf);
    console.log("✓", `${type}-${angle}`, p.name_ar);
    n++;
  }
}
await r.close();
console.log(n, "previews written");
