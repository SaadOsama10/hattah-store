// Storage housekeeping (Instagram keeps its own copy of everything published):
//  • post/story/cover images and any left-over video of posts published, skipped or failed 14+ days ago
//  • orphans: every day-folder (YYYY-MM-DD/) in the bucket older than 16 days (regenerated/replaced files)
// Cut-out cache and other non-day folders are never touched. Usage: tsx src/cleanup.ts [--dry]
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { SOCIAL_BUCKET } from "./db.js";
import { bucketPath } from "./storage.js";
import { log } from "./time.js";

loadEnv();
const dry = process.argv.includes("--dry");
const sb = getSupabase();
const DAY = 86400e3;
let removed = 0;

// Unfinished manual drafts (/admin/social/new) abandoned for 3+ days: delete the row and its files.
const { data: drafts } = await sb
  .from("social_posts")
  .select("id, image_url, video_url, slides")
  .eq("status", "composing")
  .lt("created_at", new Date(Date.now() - 3 * DAY).toISOString());
for (const r of drafts ?? []) {
  const paths = [r.image_url, r.video_url, ...((r.slides as string[] | null) ?? [])].filter(Boolean).map((u) => bucketPath(u as string)).filter(Boolean) as string[];
  log(`${dry ? "[dry] " : ""}stale manual draft ${r.id}: ${paths.length} file(s)`);
  if (!dry) {
    if (paths.length) await sb.storage.from(SOCIAL_BUCKET).remove(paths);
    await sb.from("social_posts").delete().eq("id", r.id).eq("status", "composing");
  }
  removed += paths.length;
}

const cutoff = new Date(Date.now() - 14 * DAY).toISOString();
const { data: old } = await sb
  .from("social_posts")
  .select("id, image_url, video_url, slides, status")
  .in("status", ["published", "skipped", "failed"])
  .lt("scheduled_at", cutoff)
  .or("image_url.not.is.null,video_url.not.is.null,slides.not.is.null");
for (const r of old ?? []) {
  const paths = [r.image_url, r.video_url, ...((r.slides as string[] | null) ?? [])].filter(Boolean).map((u) => bucketPath(u as string)).filter(Boolean) as string[];
  if (!paths.length) continue;
  log(`${dry ? "[dry] " : ""}old ${r.status} post ${r.id}: ${paths.length} file(s)`);
  if (!dry) {
    await sb.storage.from(SOCIAL_BUCKET).remove(paths);
    await sb.from("social_posts").update({ image_url: null, video_url: null, slides: null }).eq("id", r.id);
  }
  removed += paths.length;
}

const { data: top } = await sb.storage.from(SOCIAL_BUCKET).list("", { limit: 1000 });
const orphanBefore = new Date(Date.now() - 16 * DAY).toISOString().slice(0, 10);
for (const f of top ?? []) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.name) || f.name >= orphanBefore) continue;
  for (;;) {
    const { data: files } = await sb.storage.from(SOCIAL_BUCKET).list(f.name, { limit: 1000 });
    if (!files?.length) break;
    log(`${dry ? "[dry] " : ""}orphan folder ${f.name}: ${files.length} file(s)`);
    if (dry) break;
    await sb.storage.from(SOCIAL_BUCKET).remove(files.map((x) => `${f.name}/${x.name}`));
    removed += files.length;
  }
}
// Unreferenced files: regenerations/music swaps/test renders leave the previous mp4/jpg in the day folder and nothing
// points at it any more (the 8/11 audit found ~60 such orphan mp4s ≈ 230 MB, i.e. half the bucket). Delete files in
// day folders older than 2 days that no post row references (image/video/slides/manual_params).
{
  const { data: rows } = await sb.from("social_posts").select("image_url, video_url, slides, manual_params");
  const refs = new Set<string>();
  const manualText: string[] = [];
  for (const r of rows ?? []) {
    for (const u of [r.image_url, r.video_url, ...((r.slides as string[] | null) ?? [])]) {
      const bp = u ? bucketPath(u as string) : null;
      if (bp) refs.add(bp);
    }
    if (r.manual_params) manualText.push(JSON.stringify(r.manual_params));
  }
  const manualBlob = manualText.join("\n");
  const keepFrom = new Date(Date.now() - 2 * DAY).toISOString().slice(0, 10);
  let freed = 0;
  for (const f of top ?? []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.name) || f.name >= keepFrom || f.name < orphanBefore) continue; // older folders: handled above
    const { data: files } = await sb.storage.from(SOCIAL_BUCKET).list(f.name, { limit: 1000 });
    const stale = (files ?? []).filter((x) => {
      const path = `${f.name}/${x.name}`;
      return x.name.endsWith(".mp4") || /\.(jpe?g|png)$/.test(x.name) ? !refs.has(path) && !manualBlob.includes(path) : false;
    });
    if (!stale.length) continue;
    const bytes = stale.reduce((a, x) => a + ((x.metadata as { size?: number } | null)?.size ?? 0), 0);
    log(`${dry ? "[dry] " : ""}unreferenced in ${f.name}: ${stale.length} file(s), ${(bytes / 1e6).toFixed(1)} MB`);
    freed += bytes;
    if (!dry) await sb.storage.from(SOCIAL_BUCKET).remove(stale.map((x) => `${f.name}/${x.name}`));
    removed += stale.length;
  }
  log(`${dry ? "[dry] " : ""}unreferenced files: ${(freed / 1e6).toFixed(1)} MB`);
}
log(`${dry ? "[dry] would remove" : "removed"} ${removed} file(s)`);
process.exit(0);
