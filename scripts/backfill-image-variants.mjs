// One-off / re-runnable: generates the small WebP variants (w480, w960) for every product
// photo already in Supabase Storage. Usage: node scripts/backfill-image-variants.mjs
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BUCKET = "product-images";
const marker = `/object/public/${BUCKET}/`;
const WIDTHS = [480, 960];
const variantPath = (p, w) => p.replace(/\.[a-z0-9]+(\?.*)?$/i, "") + `.w${w}.webp`;

const { data: rows, error } = await sb.from("product_images").select("image_url");
if (error) throw error;
const paths = [...new Set(rows.map((r) => r.image_url.slice(r.image_url.indexOf(marker) + marker.length)))];
console.log(paths.length, "photos");

let done = 0, failed = 0;
async function one(path) {
  try {
    // Already done? (re-runnable)
    const probe = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${variantPath(path, 960)}`, { method: "HEAD" });
    if (probe.ok) { done++; return; }
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const src = Buffer.from(await res.arrayBuffer());
    for (const w of WIDTHS) {
      const webp = await sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      const { error: e } = await sb.storage.from(BUCKET).upload(variantPath(path, w), webp, { contentType: "image/webp", upsert: true });
      if (e) throw e;
    }
    done++;
  } catch (e) {
    failed++;
    console.error("FAILED", path, e.message ?? e);
  }
  if ((done + failed) % 50 === 0) console.log(done + failed, "/", paths.length);
}
const queue = [...paths];
await Promise.all(Array.from({ length: 3 }, async () => { for (let p = queue.shift(); p; p = queue.shift()) await one(p); }));
console.log(`done ${done}, failed ${failed}`);
