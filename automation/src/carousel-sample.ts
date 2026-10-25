// Renders a sample carousel → ./previews/carousel-N.jpg (placeholder text, no OpenAI, no DB writes).
import { mkdirSync, writeFileSync } from "node:fs";
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { Renderer } from "./render/render.js";
import { renderDetailsSlide, renderPhotoSlide } from "./render/carousel.js";
import { placeholderDesign } from "./captions.js";
import { effectivePrice, sortedImages } from "./products.js";

loadEnv();
const sb = getSupabase();
const { data: products } = await sb.from("products").select("*, product_images(image_url, sort_order), product_quantities(label_ar,label_en,price), product_sizes(label), product_colors(label_ar,label_en)").limit(300);
const { data: cats } = await sb.from("categories").select("key,label_ar");
const catMap = new Map((cats ?? []).map((c) => [c.key as string, c.label_ar as string]));
const p: any = (products ?? []).filter((x: any) => sortedImages(x).length >= 4).sort((a: any, b: any) => b.product_sizes.length - a.product_sizes.length)[0];
const imgs = sortedImages(p);
const price = effectivePrice(p);
const r = new Renderer(sb);
mkdirSync("previews", { recursive: true });
try {
  const text = placeholderDesign(p, "heritage", 1);
  const extra = imgs.slice(1, 4);
  const total = extra.length + 2;
  const out: Buffer[] = [
    await r.render({ type: "feed", angle: "heritage", nameAr: p.name_ar, categoryAr: catMap.get(p.category) ?? "", price: price.current, oldPrice: price.old, photoUrl: imgs[0], text }),
  ];
  for (const [i, u] of extra.entries()) out.push(await renderPhotoSlide(r, { photoUrl: u, nameAr: p.name_ar, index: i + 1, total, variant: i + 1 }));
  out.push(
    await renderDetailsSlide(r, {
      nameAr: p.name_ar,
      categoryAr: catMap.get(p.category) ?? "",
      price: price.current,
      oldPrice: price.old,
      details: ["🧵 تطريز يدوي بخيوط ثابتة اللون", "📏 مقاسات متعددة لتناسب الجميع", "🎁 جاهزة للإهداء بتغليف أنيق", "🧼 غسيل لطيف على درجة حرارة منخفضة"],
      options: [...p.product_sizes.map((x: any) => x.label), ...p.product_colors.map((c: any) => c.label_ar)],
      index: total - 1,
      total,
    }),
  );
  out.forEach((b, i) => writeFileSync(`previews/carousel-${i + 1}.jpg`, b));
  console.log(`«${p.name_ar}»: ${out.length} slides`);
} finally {
  await r.close();
}
process.exit(0);
