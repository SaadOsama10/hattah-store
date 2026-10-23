// Creates the posts for a day. Usage: tsx src/generate.ts [--date=YYYY-MM-DD | --tomorrow]
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { Renderer } from "./render/render.js";
import { addDays, istanbulDate, log, slotToUtc } from "./time.js";
import { buildPostAssets, loadCategories, loadSettings, pickProducts } from "./pipeline.js";

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

// Slots that don't have a row yet for that date (so reruns are idempotent).
const dayStart = slotToUtc(date, "00:00").toISOString();
const dayEnd = slotToUtc(addDays(date, 1), "00:00").toISOString();
const { data: existing } = await sb
  .from("social_posts")
  .select("scheduled_at, post_type, product_id, status")
  .gte("scheduled_at", dayStart)
  .lt("scheduled_at", dayEnd);
const taken = new Set(
  (existing ?? []).filter((e) => e.status !== "skipped").map((e) => `${new Date(e.scheduled_at).getTime()}|${e.post_type}`),
);
const slots = settings.daily_slots
  .map((s) => ({ ...s, at: slotToUtc(date, s.time) }))
  .filter((s) => !taken.has(`${s.at.getTime()}|${s.type}`))
  .sort((a, b) => a.at.getTime() - b.at.getTime());
log(`date ${date} (Istanbul): ${slots.length} slot(s) to fill`);
if (!slots.length) process.exit(0);

// Last post before this day → category continuity across midnight.
const { data: prev } = await sb
  .from("social_posts")
  .select("products(category)")
  .lt("scheduled_at", dayStart)
  .neq("status", "skipped")
  .order("scheduled_at", { ascending: false })
  .limit(1);
const previousCategory = (prev?.[0] as any)?.products?.category ?? null;

const picks = await pickProducts(sb, settings, cats, slots.length, {
  excludeIds: (existing ?? []).map((e) => e.product_id).filter(Boolean),
  previousCategory,
});
if (picks.length < slots.length) log(`only ${picks.length} eligible product(s) found`);

const renderer = new Renderer(sb);
try {
  for (const [i, pick] of picks.entries()) {
    const slot = slots[i];
    const status = settings.auto_approve ? "approved" : "draft";
    const { data: row, error } = await sb
      .from("social_posts")
      .insert({
        product_id: pick.product.id,
        post_type: slot.type,
        angle: pick.angle,
        scheduled_at: slot.at.toISOString(),
        status: "draft",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    log(`slot ${slot.time} ${slot.type} ← «${pick.product.name_ar}» (${pick.angle})`);
    try {
      const assets = await buildPostAssets(sb, renderer, settings, cats, row, pick.product, {
        image: true,
        caption: slot.type === "feed",
      });
      const { error: upErr } = await sb.from("social_posts").update({ ...assets, status }).eq("id", row.id);
      if (upErr) throw new Error(upErr.message);
    } catch (e) {
      const msg = (e as Error).message;
      log("✗ failed:", msg);
      await sb.from("social_posts").update({ status: "failed", error: `generate: ${msg}` }).eq("id", row.id);
    }
  }
} finally {
  await renderer.close();
}
log("done");
