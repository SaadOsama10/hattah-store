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
log(`${dry ? "[dry] would remove" : "removed"} ${removed} file(s)`);
process.exit(0);
