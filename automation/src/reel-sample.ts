// Renders sample reels → ./previews/reel-N.mp4 (+ cover jpg). Usage: tsx src/reel-sample.ts [count]
// Uses placeholder hook text (no OpenAI) and MUSIC_DIR for local music files.
import { mkdirSync, writeFileSync } from "node:fs";
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { ReelRenderer } from "./render/reel.js";
import { placeholderDesign } from "./captions.js";
import { effectivePrice, sortedImages } from "./products.js";
import { pickTrack, trackFile } from "./music.js";
import { ANGLES } from "./types.js";

loadEnv();
const sb = getSupabase();
const count = Number(process.argv[2] ?? 3);
const { data: products } = await sb.from("products").select("*, product_images(image_url, sort_order), product_quantities(label_ar,label_en,price)").limit(300);
const { data: cats } = await sb.from("categories").select("key,label_ar");
const catMap = new Map((cats ?? []).map((c) => [c.key as string, c.label_ar as string]));
const withPhotos = (products ?? []).filter((p: any) => sortedImages(p).length > 1);
const byLen = [...withPhotos].sort((a: any, b: any) => b.name_ar.length - a.name_ar.length);
const picks = [withPhotos[0], byLen[0], withPhotos[Math.floor(withPhotos.length / 2)]].slice(0, count);
mkdirSync("previews", { recursive: true });
const r = new ReelRenderer(sb);
try {
  for (const [i, p] of picks.entries()) {
    const imgs = sortedImages(p);
    const price = effectivePrice(p);
    const track = pickTrack(i * 3);
    const music = await trackFile(sb, track);
    const text = placeholderDesign(p, ANGLES[i % 4], i);
    console.log(`reel ${i + 1}: «${p.name_ar}» | ${text.headline} | ♪ ${track.title}`);
    const { video, cover } = await r.render(
      { nameAr: p.name_ar, categoryAr: catMap.get(p.category) ?? "", price: price.current, oldPrice: price.old, photoUrl: imgs[0], photoUrl2: imgs[1], text },
      music,
      i * 4,
    );
    writeFileSync(`previews/reel-${i + 1}.mp4`, video);
    writeFileSync(`previews/reel-${i + 1}.jpg`, cover);
  }
} finally {
  await r.close();
}
process.exit(0);
