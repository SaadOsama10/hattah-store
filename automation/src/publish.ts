// Publishes due posts. Usage: tsx src/publish.ts [--post=<uuid>]  (--post = "publish now")
import { loadEnv, isDryRun } from "./env.js";
import { getSupabase } from "./db.js";
import { publishFacebook, publishInstagram, MetaError } from "./meta.js";
import { loadSettings } from "./pipeline.js";
import { removeFromBucket } from "./storage.js";
import { log, sleep } from "./time.js";
import type { SocialPostRow } from "./types.js";

loadEnv();
const postArg = process.argv.find((a) => a.startsWith("--post="))?.slice(7);
const dry = isDryRun();
const MAX_ATTEMPTS = 3;
const MISSED_AFTER_MS = 12 * 3600e3;

const sb = getSupabase();
const settings = await loadSettings(sb);
if (dry) log("DRY_RUN=true → Meta will NOT be called and the database will not be modified");

// Rows stuck in 'publishing' (crashed run) are never auto-retried — we can't
// know whether Meta already accepted them, and a duplicate post is worse.
if (!dry) {
  const { data: stuck } = await sb
    .from("social_posts")
    .update({ status: "failed", error: "Run interrupted while publishing — check Instagram/Facebook, then retry manually" })
    .eq("status", "publishing")
    .lt("locked_at", new Date(Date.now() - 45 * 60e3).toISOString())
    .select("id");
  if (stuck?.length) log(`marked ${stuck.length} stuck post(s) as failed`);
}

let due: SocialPostRow[];
if (postArg) {
  const { data } = await sb.from("social_posts").select("*").eq("id", postArg).in("status", ["draft", "approved", "failed"]);
  due = (data ?? []) as SocialPostRow[];
} else {
  if (!settings.enabled) {
    log("social automation disabled → nothing to publish");
    process.exit(0);
  }
  const statuses = settings.auto_approve ? ["approved", "draft"] : ["approved"];
  const { data } = await sb
    .from("social_posts")
    .select("*")
    .in("status", statuses)
    .lte("scheduled_at", new Date().toISOString())
    .not("image_url", "is", null)
    .order("scheduled_at");
  due = (data ?? []) as SocialPostRow[];
}
log(`${due.length} post(s) due`);

for (const post of due) {
  if (!postArg && Date.now() - new Date(post.scheduled_at).getTime() > MISSED_AFTER_MS) {
    log(`skip ${post.id}: missed its window`);
    if (!dry) await sb.from("social_posts").update({ status: "skipped", error: "Missed scheduled window (>12h late)" }).eq("id", post.id);
    continue;
  }

  if (dry) {
    log(`[dry] would publish ${post.post_type} ${post.id} → IG${post.post_type === "feed" ? " + FB" : ""}\n  image: ${post.image_url}${post.video_url ? "\n  video: " + post.video_url : ""}\n  caption: ${(post.caption_full ?? "").slice(0, 120).replace(/\n/g, " ⏎ ")}…`);
    continue;
  }

  // Atomic lock: only one runner can flip the row to 'publishing'.
  const { data: locked } = await sb
    .from("social_posts")
    .update({ status: "publishing", error: null, locked_at: new Date().toISOString() })
    .eq("id", post.id)
    .in("status", ["draft", "approved", "failed"])
    .select("*")
    .maybeSingle();
  if (!locked) {
    log(`skip ${post.id}: already locked by another run`);
    continue;
  }

  let igId = locked.ig_media_id as string | null;
  let fbId = locked.fb_post_id as string | null;
  let permalink = locked.ig_permalink as string | null;
  let lastError = "";
  let attempts = locked.attempts as number;
  let ok = false;

  for (let n = 1; n <= MAX_ATTEMPTS && !ok; n++) {
    attempts++;
    try {
      const story = post.post_type === "story";
      const reel = post.post_type === "reel";
      const carousel = post.post_type === "carousel";
      const loc = settings.location_id || null; // Istanbul tag on feed posts, carousels and reels
      if (!igId) {
        const r = await publishInstagram(
          reel
            ? { kind: "reel", videoUrl: post.video_url!, caption: post.caption_full, coverUrl: post.image_url, locationId: loc }
            : carousel
              ? { kind: "carousel", imageUrls: (post.slides as string[]) ?? [post.image_url!], caption: post.caption_full, locationId: loc }
              : story
                ? { kind: "story", imageUrl: post.image_url, videoUrl: post.video_url }
                : { kind: "feed", imageUrl: post.image_url!, caption: post.caption_full, locationId: loc },
        );
        igId = r.id;
        permalink = r.permalink;
        // Persist immediately: a later FB failure must never re-post IG.
        await sb.from("social_posts").update({ ig_media_id: igId, ig_permalink: permalink }).eq("id", post.id);
        log(`✓ Instagram ${igId}`);
      }
      // Facebook is off by default: Instagram's own auto-share puts the post on the Page (API posts are hidden while the app is unpublished).
      if (!story && !reel && !carousel && !fbId && settings.publish_to_facebook === true) {
        fbId = (await publishFacebook(post.image_url!, post.caption_full ?? "")).id;
        await sb.from("social_posts").update({ fb_post_id: fbId }).eq("id", post.id);
        log(`✓ Facebook ${fbId}`);
      }
      ok = true;
    } catch (e) {
      lastError = (e as Error).message;
      log(`✗ attempt ${n}/${MAX_ATTEMPTS} failed: ${lastError}`);
      if (e instanceof MetaError && !e.retryable) break;
      if (n < MAX_ATTEMPTS) await sleep(15000 * n * n);
    }
  }

  // A reel's video is only needed until Instagram has it: drop it from storage right away.
  if (ok && post.video_url) {
    await removeFromBucket(sb, post.video_url);
    await sb.from("social_posts").update({ video_url: null }).eq("id", post.id);
  }
  await sb
    .from("social_posts")
    .update(
      ok
        ? { status: "published", published_at: new Date().toISOString(), attempts, error: null }
        : { status: "failed", attempts, error: lastError.slice(0, 500) },
    )
    .eq("id", post.id);

  // Circuit breaker: two failed publishes in a row (expired token, Meta error…) switch the
  // whole system off and leave a red warning in /admin/social.
  if (ok) {
    if (settings.consecutive_failures) {
      await sb.from("social_settings").update({ consecutive_failures: 0 }).eq("id", 1);
      settings.consecutive_failures = 0;
    }
  } else {
    const failures = (settings.consecutive_failures ?? 0) + 1;
    settings.consecutive_failures = failures;
    if (failures >= 2) {
      await sb
        .from("social_settings")
        .update({
          enabled: false,
          consecutive_failures: failures,
          last_error: lastError.slice(0, 500),
          auto_disabled_at: new Date().toISOString(),
        })
        .eq("id", 1);
      log(`⛔ ${failures} publish failures in a row → automation switched OFF. Last error: ${lastError}`);
      break;
    }
    await sb.from("social_settings").update({ consecutive_failures: failures, last_error: lastError.slice(0, 500) }).eq("id", 1);
  }
  await sleep(3000);
}
log("done");
process.exit(0);
