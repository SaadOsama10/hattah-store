// Same template, 3 different products → previews/text-<angle>.jpg (montage)
import sharp from "sharp";
import { Renderer } from "./render/render.js";
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { placeholderDesign } from "./captions.js";
import { effectivePrice, categoryLabelAr, sortedImages } from "./products.js";
import type { Angle } from "./types.js";

loadEnv();
const sb = getSupabase();
const { data: products } = await sb.from("products").select("*, product_images(image_url, sort_order), product_quantities(label_ar,label_en,price)");
const { data: cats } = await sb.from("categories").select("key,label_ar");
const catMap = new Map((cats ?? []).map((c) => [c.key as string, c.label_ar as string]));
const find = (f: string) => (products ?? []).find((p: any) => p.name_ar.includes(f))!;
const three = [find("شماغ"), find("بازل المسجد"), find("مسبحة")];
const r = new Renderer(sb);
for (const angle of ["showcase", "heritage", "quote", "offer"] as Angle[]) {
  const bufs: Buffer[] = [];
  for (const [i, p] of three.entries()) {
    const price = effectivePrice(p);
    bufs.push(
      await sharp(
        await r.render({
          type: "feed",
          angle,
          nameAr: p.name_ar,
          categoryAr: categoryLabelAr(catMap, p.category),
          price: price.current,
          oldPrice: price.old,
          photoUrl: sortedImages(p)[0],
          text: placeholderDesign(p, angle, i),
        }),
      ).resize(540, 675).toBuffer(),
    );
    console.log(angle, p.name_ar.slice(0, 30), "·", placeholderDesign(p, angle, i).headline, "|", r.lastViolations, "violations");
  }
  await sharp({ create: { width: 3 * 550 + 10, height: 685, channels: 3, background: "#2b2b2b" } })
    .composite(bufs.map((input, i) => ({ input, left: 10 + i * 550, top: 5 })))
    .jpeg({ quality: 90 })
    .toFile(`previews/text-${angle}.jpg`);
}
await r.close();
