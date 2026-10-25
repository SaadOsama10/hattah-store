// Renders sample story videos → ./previews/story-N.mp4. Usage: tsx src/story-sample.ts [count]  (MUSIC_DIR for local music)
import { mkdirSync, writeFileSync } from "node:fs";
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { Renderer } from "./render/render.js";
import { renderStoryVideo, STORY_SECONDS } from "./render/story.js";
import { placeholderDesign } from "./captions.js";
import { effectivePrice, sortedImages } from "./products.js";
import { musicStartFor, tracks, trackFile } from "./music.js";
import type { Angle } from "./types.js";

loadEnv();
const sb = getSupabase();
const count = Number(process.argv[2] ?? 2);
const { data: products } = await sb.from("products").select("*, product_images(image_url, sort_order), product_quantities(label_ar,label_en,price)").limit(300);
const { data: cats } = await sb.from("categories").select("key,label_ar");
const catMap = new Map((cats ?? []).map((c) => [c.key as string, c.label_ar as string]));
const withPhotos = (products ?? []).filter((p: any) => sortedImages(p).length > 1);
const find = (frag: string) => withPhotos.find((p: any) => p.name_ar.includes(frag));
const picks: [any, Angle][] = [
  [find("شال كتف") ?? withPhotos[0], "showcase"],
  [find("هودي") ?? withPhotos[1], "quote"],
  [find("قلادة") ?? withPhotos[2], "heritage"],
  [find("ثوب") ?? withPhotos[3], "offer"],
].slice(0, count) as [any, Angle][];
mkdirSync("previews", { recursive: true });
const r = new Renderer(sb);
try {
  for (const [i, [p, angle]] of picks.entries()) {
    const imgs = sortedImages(p);
    const price = effectivePrice(p);
    const track = tracks()[(i * 3 + 2) % tracks().length];
    const music = await trackFile(sb, track);
    const text = placeholderDesign(p, angle, i);
    console.log(`story ${i + 1}: «${p.name_ar}» ${angle} | ${text.headline} | ♪ ${track.title}`);
    const { video, cover } = await renderStoryVideo(
      r,
      { type: "story", angle, nameAr: p.name_ar, categoryAr: catMap.get(p.category) ?? "", price: price.current, oldPrice: price.old, photoUrl: imgs[1] ?? imgs[0], text },
      music,
      musicStartFor(track, i, STORY_SECONDS),
    );
    writeFileSync(`previews/story-${i + 1}.mp4`, video);
    writeFileSync(`previews/story-${i + 1}.jpg`, cover);
  }
} finally {
  await r.close();
}
process.exit(0);
