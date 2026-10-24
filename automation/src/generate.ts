// Creates all of a day's posts in ONE run.
// Usage: tsx src/generate.ts [--date=YYYY-MM-DD | --tomorrow] [--only=story@21:15,story@22:15] [--jitter=0]
//   --only   fill just these slots (type@HH:MM) instead of settings.daily_slots (skips ones already taken)
//   --jitter override the ± random offset in minutes
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { Renderer } from "./render/render.js";
import { ReelRenderer } from "./render/reel.js";
import { addDays, istanbulDate, log, slotToUtc } from "./time.js";
import { PRODUCT_SELECT, buildPostAssets, buildReelAssets, loadCategories, loadSettings, pickProducts, type ProductPick } from "./pipeline.js";
import { sortedImages } from "./products.js";
import { ANGLES, type Angle, type PostType, type ProductRecord } from "./types.js";

loadEnv();
const args = process.argv.slice(2);
const dateArg = args.find((a) => a.startsWith("--date="))?.slice(7);
const onlyArg = args.find((a) => a.startsWith("--only="))?.slice(7);
const jitterArg = args.find((a) => a.startsWith("--jitter="))?.slice(9);
const date = dateArg || (args.includes("--tomorrow") ? addDays(istanbulDate(), 1) : istanbulDate());

const sb = getSupabase();
const settings = await loadSettings(sb);
if (!settings.enabled && process.env.FORCE !== "true") {
  log("social automation is disabled in social_settings → nothing to do");
  process.exit(0);
}
const cats = await loadCategories(sb);

// ── which slots still need a post for that day (stable key, not the jittered time) ──
const dayStart = slotToUtc(date, "00:00").toISOString();
const dayEnd = slotToUtc(addDays(date, 1), "00:00").toISOString();
const { data: existing } = await sb
  .from("social_posts")
  .select("slot_key, post_type, product_id, status, angle")
  .gte("scheduled_at", dayStart)
  .lt("scheduled_at", dayEnd);
const taken = new Set((existing ?? []).filter((e) => e.status !== "skipped").map((e) => e.slot_key));
const wanted = onlyArg
  ? onlyArg.split(",").map((x) => {
      const [type, time] = x.split("@");
      if ((type !== "feed" && type !== "story" && type !== "reel") || !/^\d\d:\d\d$/.test(time ?? "")) throw new Error(`bad --only entry: ${x}`);
      return { type: type as PostType, time };
    })
  : settings.daily_slots;
const slots = wanted
  .map((s) => ({ ...s, key: `${s.type}|${s.time}` }))
  .filter((s) => !taken.has(s.key))
  .sort((a, b) => a.time.localeCompare(b.time));
log(`date ${date} (Istanbul): ${slots.length} slot(s) to fill`);
if (!slots.length) process.exit(0);

/** Nominal slot time ± a random offset so posts don't look robotic. */
function jittered(time: string): Date {
  const j = Math.max(0, jitterArg !== undefined ? Number(jitterArg) : (settings.jitter_minutes ?? 10));
  const offset = Math.round((Math.random() * 2 - 1) * j);
  // Never before 09:00 and never past 23:59 (Istanbul), whatever the jitter.
  const lo = slotToUtc(date, "09:00").getTime();
  const hi = slotToUtc(date, "23:59").getTime();
  return new Date(Math.min(hi, Math.max(lo, slotToUtc(date, time).getTime() + offset * 60_000)));
}

// ── product selection ──
const feedSlots = slots.filter((s) => s.type === "feed");
const reelSlots = slots.filter((s) => s.type === "reel");
const storySlots = slots.filter((s) => s.type === "story");

const { data: prev } = await sb
  .from("social_posts")
  .select("products(category)")
  .lt("scheduled_at", dayStart)
  .neq("status", "skipped")
  .order("scheduled_at", { ascending: false })
  .limit(1);
const previousCategory = (prev?.[0] as any)?.products?.category ?? null;

const feedPicks = await pickProducts(sb, settings, cats, feedSlots.length, {
  excludeIds: (existing ?? []).map((e) => e.product_id).filter(Boolean),
  previousCategory,
  rotationDays: "auto",
});
if (feedPicks.length < feedSlots.length) log(`only ${feedPicks.length} eligible product(s) for ${feedSlots.length} feed slots`);

type Job = { slot: (typeof slots)[number]; type: PostType; product: ProductRecord; angle: Angle };
const jobs: Job[] = feedPicks.map((p, i) => ({ slot: feedSlots[i], type: "feed", product: p.product, angle: p.angle }));

// Reels: products that are NOT among the day's feed posts (nor already used today).
const reelPicks = reelSlots.length
  ? await pickProducts(sb, settings, cats, reelSlots.length, {
      excludeIds: [...feedPicks.map((p) => p.product.id), ...(existing ?? []).map((e) => e.product_id).filter(Boolean)],
      rotationDays: "auto",
    })
  : [];
if (reelPicks.length < reelSlots.length) log(`only ${reelPicks.length} eligible product(s) for ${reelSlots.length} reel slots`);
for (const [i, slot] of reelSlots.entries()) {
  if (reelPicks[i]) jobs.push({ slot, type: "reel", product: reelPicks[i].product, angle: reelPicks[i].angle });
}

// Stories: a random mix of the day's feed products (always a different angle, and a
// different photo — so only products with 2+ photos) and other eligible products.
// A product never appears twice in the day's stories.
const MAX_FEED_OVERLAP = 3;
const usedStoryIds = new Set((existing ?? []).filter((e) => e.post_type === "story" && e.status !== "skipped").map((e) => e.product_id));
const existingFeed: ProductPick[] = [];
for (const e of (existing ?? []).filter((x) => x.post_type === "feed" && x.status !== "skipped" && x.product_id)) {
  const { data: prod } = await sb.from("products").select(PRODUCT_SELECT).eq("id", e.product_id).maybeSingle();
  if (prod) existingFeed.push({ product: prod as unknown as ProductRecord, angle: e.angle as Angle });
}
const overlap = [...feedPicks, ...existingFeed]
  .filter((p) => sortedImages(p.product).length > 1 && !usedStoryIds.has(p.product.id))
  .sort(() => Math.random() - 0.5);
const overlapCount = Math.min(overlap.length, MAX_FEED_OVERLAP, storySlots.length);
const others = storySlots.length - overlapCount
  ? await pickProducts(sb, settings, cats, storySlots.length - overlapCount, {
      excludeIds: [...feedPicks.map((p) => p.product.id), ...reelPicks.map((p) => p.product.id), ...(existing ?? []).map((e) => e.product_id).filter(Boolean)],
      rotationDays: "auto",
    })
  : [];
const storyPicks: ProductPick[] = [
  ...overlap.slice(0, overlapCount).map((base) => {
    const options = ANGLES.filter((a) => a !== base.angle);
    return { product: base.product, angle: options[Math.floor(Math.random() * options.length)] };
  }),
  ...others,
];
// Not enough fresh products → top up with remaining feed products (still never a duplicate).
for (const base of overlap.slice(overlapCount)) {
  if (storyPicks.length >= storySlots.length) break;
  const options = ANGLES.filter((a) => a !== base.angle);
  storyPicks.push({ product: base.product, angle: options[Math.floor(Math.random() * options.length)] });
}
if (storyPicks.length < storySlots.length) log(`only ${storyPicks.length} eligible product(s) for ${storySlots.length} story slots`);
const shuffledStories = storyPicks.sort(() => Math.random() - 0.5);
for (const [i, slot] of storySlots.entries()) {
  const pick = shuffledStories[i];
  if (pick) jobs.push({ slot, type: "story", product: pick.product, angle: pick.angle });
}

// ── generate everything; one item failing never blocks the others ──
const renderer = new Renderer(sb);
const reelRenderer = new ReelRenderer(sb);
// Music rotation: continue from however many reels exist already (each reel in this run takes the next track).
const { count: reelsSoFar } = await sb.from("social_posts").select("id", { count: "exact", head: true }).eq("post_type", "reel");
let reelOrdinal = reelsSoFar ?? 0;
const status = settings.auto_approve ? "approved" : "draft";
let ok = 0;
let skipped = 0;

async function runJob(job: Job) {
  const label = `${job.type} ${job.slot.time} «${job.product.name_ar}» (${job.angle})`;
  const { data: row, error } = await sb
    .from("social_posts")
    .insert({
      product_id: job.product.id,
      post_type: job.type,
      angle: job.angle,
      scheduled_at: jittered(job.slot.time).toISOString(),
      slot_key: job.slot.key,
      status: "draft",
    })
    .select()
    .single();
  if (error) {
    log(`✗ SKIPPED ${label}: insert failed — ${error.message}`);
    skipped++;
    return;
  }
  const musicIndex = job.type === "reel" ? reelOrdinal++ : 0;
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const assets =
        job.type === "reel"
          ? await buildReelAssets(sb, reelRenderer, settings, cats, row, job.product, musicIndex)
          : await buildPostAssets(sb, renderer, settings, cats, row, job.product, {
              image: true,
              caption: job.type === "feed",
            });
      const { error: upErr } = await sb.from("social_posts").update({ ...assets, status }).eq("id", row.id);
      if (upErr) throw new Error(upErr.message);
      log(`✓ ${label}`);
      ok++;
      return;
    } catch (e) {
      lastErr = (e as Error).message;
      log(`… ${label} attempt ${attempt}/2 failed: ${lastErr}`);
    }
  }
  // Skip this slot only; the error stays visible in the admin history.
  await sb.from("social_posts").update({ status: "skipped", error: `generation failed: ${lastErr}`.slice(0, 500) }).eq("id", row.id);
  log(`✗ SKIPPED ${label}`);
  skipped++;
}

try {
  // 4 workers: the 18 items of a day finish in a few minutes (OpenAI calls: 8 captions + 10 on-image texts).
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) await runJob(job);
    }),
  );
} finally {
  await renderer.close();
  await reelRenderer.close();
}
log(`done: ${ok} generated, ${skipped} skipped`);
// Explicit exit: leftover keep-alive sockets / browser handles must never hang the Actions job.
process.exit(0);
