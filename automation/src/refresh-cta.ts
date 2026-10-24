// Rewrites ONLY the closing CTA of upcoming, unpublished feed captions (rest of the caption untouched).
// Usage: tsx src/refresh-cta.ts [--dry]
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { loadSettings } from "./pipeline.js";
import { CTA_POOL, renderCta } from "./captions.js";
import { istanbulDate, log } from "./time.js";

loadEnv();
const dry = process.argv.includes("--dry");
const sb = getSupabase();
const settings = await loadSettings(sb);
const { data, error } = await sb
  .from("social_posts")
  .select("id, scheduled_at, caption_full, status")
  .eq("post_type", "feed")
  .in("status", ["draft", "approved"])
  .gte("scheduled_at", new Date().toISOString())
  .not("caption_full", "is", null)
  .order("scheduled_at");
if (error) throw new Error(error.message);

const usedByDay = new Map<string, Set<number>>();
for (const r of data ?? []) {
  const day = istanbulDate(new Date(r.scheduled_at));
  const used = usedByDay.get(day) ?? new Set<number>();
  usedByDay.set(day, used);
  const free = CTA_POOL.map((_, i) => i).filter((i) => !used.has(i));
  const idx = free[Math.floor(Math.random() * free.length)];
  used.add(idx);

  // Caption layout: body \n\n CTA \n\n hashtags — the CTA is the paragraph before the hashtag line.
  const paras = (r.caption_full as string).split("\n\n");
  const last = paras.length - 1;
  if (last < 2 || !paras[last].trim().startsWith("#")) {
    log(`skip ${r.id}: unexpected caption layout`);
    continue;
  }
  paras[last - 1] = renderCta(idx, settings.store_url);
  const next = paras.join("\n\n");
  log(`${dry ? "[dry] " : ""}${r.scheduled_at.slice(0, 16)} ${r.id} → CTA #${idx}: ${paras[last - 1]}`);
  if (!dry) {
    const { error: e } = await sb.from("social_posts").update({ caption_full: next }).eq("id", r.id).in("status", ["draft", "approved"]);
    if (e) throw new Error(e.message);
  }
}
log(`done: ${data?.length ?? 0} post(s)`);
process.exit(0);
