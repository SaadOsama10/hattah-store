// Creates all of a day's posts in ONE run.
// Usage: tsx src/generate.ts [--date=YYYY-MM-DD | --tomorrow]
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { Renderer } from "./render/render.js";
import { addDays, istanbulDate, log, slotToUtc } from "./time.js";
import { buildPostAssets, loadCategories, loadSettings, pickProducts, type ProductPick } from "./pipeline.js";
import { ANGLES, type Angle, type PostType, type ProductRecord } from "./types.js";

loadEnv();
const args = process.argv.slice(2);
const dateArg = args.find((a) => a.startsWith("--date="))?.slice(7);
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
  .select("slot_key, post_type, product_id, status")
  .gte("scheduled_at", dayStart)
  .lt("scheduled_at", dayEnd);
const taken = new Set((existing ?? []).filter((e) => e.status !== "skipped").map((e) => e.slot_key));
const slots = settings.daily_slots
  .map((s) => ({ ...s, key: `${s.type}|${s.time}` }))
  .filter((s) => !taken.has(s.key))
  .sort((a, b) => a.time.localeCompare(b.time));
log(`date ${date} (Istanbul): ${slots.length} slot(s) to fill`);
if (!slots.length) process.exit(0);

/** Nominal slot time ± a random offset so posts don't look robotic. */
function jittered(time: string): Date {
  const j = Math.max(0, settings.jitter_minutes ?? 10);
  const offset = Math.round((Math.random() * 2 - 1) * j);
  return new Date(slotToUtc(date, time).getTime() + offset * 60_000);
}

// ── product selection ──
const feedSlots = slots.filter((s) => s.type === "feed");
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

// Stories reuse one of the day's feed products (random), always with a different angle than its feed post.
const pool = [...feedPicks].sort(() => Math.random() - 0.5);
let fallback: ProductPick[] | null = null;
for (const [i, slot] of storySlots.entries()) {
  const base = pool[i % Math.max(pool.length, 1)];
  if (base) {
    const options = ANGLES.filter((a) => a !== base.angle);
    jobs.push({ slot, type: "story", product: base.product, angle: options[Math.floor(Math.random() * options.length)] });
  } else {
    fallback ??= await pickProducts(sb, settings, cats, storySlots.length, { rotationDays: "auto" });
    const f = fallback[i];
    if (f) jobs.push({ slot, type: "story", product: f.product, angle: f.angle });
  }
}

// ── generate everything; one item failing never blocks the others ──
const renderer = new Renderer(sb);
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
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const assets = await buildPostAssets(sb, renderer, settings, cats, row, job.product, {
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
  // A small worker pool keeps the whole day under a few minutes.
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) await runJob(job);
    }),
  );
} finally {
  await renderer.close();
}
log(`done: ${ok} generated, ${skipped} skipped`);
// Explicit exit: leftover keep-alive sockets / browser handles must never hang the Actions job.
process.exit(0);
