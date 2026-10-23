import { createHash } from "node:crypto";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SOCIAL_BUCKET } from "../db.js";
import { log } from "../time.js";

/** Cheap sanity check on the alpha mask: rejects results where almost nothing
 * survived, nothing was removed, or the mask is shredded into fragments. */
export async function assessCutout(png: Buffer): Promise<{ ok: boolean; reason?: string; bbox?: { left: number; top: number; width: number; height: number } }> {
  const W = 256;
  const { data, info } = await sharp(png).ensureAlpha().resize({ width: W }).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let opaque = 0;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * channels + 3];
      if (a > 128) opaque++;
      if (a > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { ok: false, reason: "empty mask" };
  const total = width * height;
  const coverage = opaque / total;
  const bboxArea = (maxX - minX + 1) * (maxY - minY + 1);
  const fill = opaque / bboxArea;
  const meta = await sharp(png).metadata();
  const sx = meta.width! / width;
  const sy = meta.height! / height;
  const pad = 0.02;
  const left = Math.max(0, Math.floor((minX - width * pad) * sx));
  const top = Math.max(0, Math.floor((minY - height * pad) * sy));
  const right = Math.min(meta.width!, Math.ceil((maxX + 1 + width * pad) * sx));
  const bottom = Math.min(meta.height!, Math.ceil((maxY + 1 + height * pad) * sy));
  const bbox = { left, top, width: right - left, height: bottom - top };
  if (coverage < 0.06) return { ok: false, reason: `too little left (${(coverage * 100).toFixed(1)}%)` };
  if (coverage > 0.96) return { ok: false, reason: "background was not removed" };
  if (fill < 0.28) return { ok: false, reason: `mask too fragmented (fill ${(fill * 100).toFixed(0)}%)` };
  return { ok: true, bbox };
}

const keyFor = (imageUrl: string) => createHash("sha1").update(imageUrl).digest("hex");

async function exists(url: string): Promise<boolean> {
  try {
    return (await fetch(url, { method: "HEAD" })).ok;
  } catch {
    return false;
  }
}

/** Returns a data: URI of the product cut-out PNG, or null when removal
 * failed / looked bad (the caller then falls back to the original photo).
 * Results — good or bad — are cached in Storage per image URL so each photo
 * is processed once. */
export async function getCutoutDataUri(sb: SupabaseClient | null, imageUrl: string): Promise<string | null> {
  const key = keyFor(imageUrl);
  const okPath = `cutouts/${key}.png`;
  const failPath = `cutouts/${key}.failed`;
  const pub = (p: string) => (sb ? sb.storage.from(SOCIAL_BUCKET).getPublicUrl(p).data.publicUrl : "");

  if (sb) {
    const hit = await fetch(pub(okPath));
    if (hit.ok) {
      log("cut-out cache hit");
      return `data:image/png;base64,${Buffer.from(await hit.arrayBuffer()).toString("base64")}`;
    }
    if (await exists(pub(failPath))) {
      log("cut-out previously rejected → original photo");
      return null;
    }
  }

  const reject = async (reason: string) => {
    log(`cut-out rejected: ${reason}`);
    if (sb) await sb.storage.from(SOCIAL_BUCKET).upload(failPath, Buffer.from(reason), { contentType: "text/plain", upsert: true });
    return null;
  };

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const src = await sharp(Buffer.from(await res.arrayBuffer()))
      .rotate()
      .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 92 })
      .toBuffer();
    // Lazy import: the model bundle is heavy and only needed here.
    const { removeBackground } = await import("@imgly/background-removal-node");
    const out = await removeBackground(new Blob([new Uint8Array(src)], { type: "image/jpeg" }));
    const raw = Buffer.from(await out.arrayBuffer());
    const png = await sharp(raw).png().toBuffer();
    const verdict = await assessCutout(png);
    if (!verdict.ok) return await reject(verdict.reason!);
    const trimmed = await sharp(png).extract(verdict.bbox!).png({ compressionLevel: 9 }).toBuffer();
    if (sb) {
      const { error } = await sb.storage.from(SOCIAL_BUCKET).upload(okPath, trimmed, { contentType: "image/png", upsert: true });
      if (error) log("cut-out cache upload failed:", error.message);
    }
    return `data:image/png;base64,${trimmed.toString("base64")}`;
  } catch (e) {
    log("cut-out failed:", (e as Error).message);
    return null; // transient errors are not cached, so a later run can retry
  }
}
