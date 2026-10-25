// Creates all of a day's posts in ONE run.
// Usage: tsx src/generate.ts [--date=YYYY-MM-DD | --tomorrow] [--only=story@21:15,story@22:15] [--jitter=0]
//   --only   fill just these slots (type@HH:MM) instead of settings.daily_slots (skips ones already taken)
//   --jitter override the ± random offset in minutes
//   --batch  daily mode: submit all text requests as one OpenAI Batch job (-50 %) and let collect.ts finish the rendering
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { Renderer } from "./render/render.js";
import { ReelRenderer } from "./render/reel.js";
import { addDays, istanbulDate, log, slotToUtc } from "./time.js";
import { PRODUCT_SELECT, completePost, loadAvoidHints, loadCategories, loadSettings, pickProducts, type ProductPick } from "./pipeline.js";
import { submitBatch } from "./batch.js";
import { usageLog, type CaptionJson, type CaptionMode } from "./captions.js";
import { sortedImages } from "./products.js";
import { ANGLES, type Angle, type PostType, type ProductRecord, type SocialPostRow } from "./types.js";

loadEnv();
const args = process.argv.slice(2);
const dateArg = args.find((a) => a.startsWith("--date="))?.slice(7);
const onlyArg = args.find((a) => a.startsWith("--only="))?.slice(7);
const jitterArg = args.find((a) => a.startsWith("--jitter="))?.slice(9);
const batchMode = args.includes("--batch") && !!process.env.OPENAI_API_KEY;
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
      if ((type !== "feed" && type !== "story" && type !== "reel" && type !== "carousel") || !/^\d\d:\d\d$/.test(time ?? "")) throw new Error(`bad --only entry: ${x}`);
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
const carouselSlots = slots.filter((s) => s.type === "carousel");
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

// Carousels: products with 3+ photos that are not among today's feed posts or reels (nor anything already posted today).
// No qualifying product → that slot becomes a normal feed post.
const dayIds = [...feedPicks.map((p) => p.product.id), ...reelPicks.map((p) => p.product.id), ...(existing ?? []).map((e) => e.product_id).filter(Boolean)];
const carouselPicks = carouselSlots.length
  ? await pickProducts(sb, settings, cats, carouselSlots.length, { excludeIds: dayIds, rotationDays: "auto", minImages: 3 })
  : [];
for (const [i, slot] of carouselSlots.entries()) {
  if (carouselPicks[i]) {
    jobs.push({ slot, type: "carousel", product: carouselPicks[i].product, angle: carouselPicks[i].angle });
  } else {
    log(`no product with 3+ photos for the ${slot.time} carousel → a normal feed post instead`);
    const [fb] = await pickProducts(sb, settings, cats, 1, { excludeIds: [...dayIds, ...carouselPicks.map((p) => p.product.id)], rotationDays: "auto" });
    if (fb) jobs.push({ slot, type: "feed", product: fb.product, angle: fb.angle });
  }
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
      excludeIds: [...dayIds, ...carouselPicks.map((p) => p.product.id)],
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
let ok = 0;
let skipped = 0;

async function insertJob(job: Job): Promise<SocialPostRow | null> {
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
    log(`✗ SKIPPED ${job.type} ${job.slot.time}: insert failed — ${error.message}`);
    skipped++;
    return null;
  }
  return row as SocialPostRow;
}
const labelOf = (job: Job) => `${job.type} ${job.slot.time} «${job.product.name_ar}» (${job.angle})`;

async function build(job: Job, row: SocialPostRow, precomputed?: CaptionJson) {
  const musicIndex = job.type === "reel" ? reelOrdinal++ : 0;
  if (await completePost(sb, { renderer, reelRenderer }, settings, cats, row, job.product, { label: labelOf(job), musicIndex, precomputed })) ok++;
  else skipped++;
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: n }, async () => {
      for (let x = queue.shift(); x; x = queue.shift()) await fn(x);
    }),
  );
}

try {
  if (batchMode) {
    // Daily 03:00 run: insert every slot, send ALL the text requests as ONE Batch API job (-50 %), and stop.
    // collect.ts renders the images/reels once the batch is done (fallback to normal calls at 07:00 Istanbul).
    const rows: { job: Job; row: SocialPostRow }[] = [];
    for (const job of jobs) {
      const row = await insertJob(job);
      if (row) rows.push({ job, row });
    }
    try {
      const items = await Promise.all(
        rows.map(async ({ job, row }) => ({
          customId: row.id,
          postId: row.id,
          productId: job.product.id,
          mode: (job.type === "story" ? "design" : "full") as CaptionMode,
          angle: job.angle,
          input: {
            product: job.product,
            categoryAr: cats.get(job.product.category)?.label_ar ?? "",
            angle: job.angle,
            languages: settings.caption_languages,
            mode: (job.type === "story" ? "design" : "full") as CaptionMode,
            avoid: await loadAvoidHints(sb, job.product.id, job.angle, row.id),
          },
        })),
      );
      const batchId = await submitBatch(items);
      const { error } = await sb.from("social_batches").insert({
        openai_batch_id: batchId,
        target_date: date,
        items: Object.fromEntries(items.map((i) => [i.customId, { mode: i.mode, product_id: i.productId, angle: i.angle }])),
      });
      if (error) throw new Error(`social_batches insert: ${error.message}`);
      log(`batch ${batchId} submitted: ${items.length} request(s) for ${date} — collect.ts will render when it finishes`);
    } catch (e) {
      log(`batch submit failed (${(e as Error).message}) → generating now with normal API calls`);
      await pool(rows, 4, ({ job, row }) => build(job, row));
    }
  } else {
    await pool(jobs, 4, async (job) => {
      const row = await insertJob(job);
      if (row) await build(job, row);
    });
  }
} finally {
  await renderer.close();
  await reelRenderer.close();
}
log(`done: ${ok} generated, ${skipped} skipped${batchMode ? " (batch mode: items waiting for the batch are not counted)" : ""}`);
if (usageLog.length) log(`OpenAI this run: ${usageLog.length} call(s) ≈ $${usageLog.reduce((a, u) => a + u.cost, 0).toFixed(4)}`);
// Explicit exit: leftover keep-alive sockets / browser handles must never hang the Actions job.
process.exit(0);
