// Finishes the daily batch: when the OpenAI batch is done, validates each answer (in code), renders the images/reels and saves the posts.
// If the batch is still running at 07:00 Istanbul (or fails/expires), it is cancelled and the remaining posts are generated with normal API calls.
// Usage: tsx src/collect.ts [--force-fallback]
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { Renderer } from "./render/render.js";
import { ReelRenderer } from "./render/reel.js";
import { istanbulDate, log, slotToUtc } from "./time.js";
import { completePost, loadCategories, loadProduct, loadRecentTexts, loadSettings } from "./pipeline.js";
import { checkCaptionJson, makeDuplicateChecker, parseModelText, recordUsage, usageLog, type CaptionJson, type CaptionMode } from "./captions.js";
import { openai, readBatchResults } from "./batch.js";
import type { SocialPostRow } from "./types.js";

loadEnv();
const forceFallback = process.argv.includes("--force-fallback");
const sb = getSupabase();
const client = openai();
const settings = await loadSettings(sb);
const cats = await loadCategories(sb);

/** 07:00 Istanbul of the submission day (or 4 h after submission when it was submitted later than that). */
function fallbackAt(createdAt: string): Date {
  const created = new Date(createdAt);
  const seven = slotToUtc(istanbulDate(created), "07:00");
  return created < seven ? seven : new Date(created.getTime() + 4 * 3600e3);
}

const { data: batches } = await sb.from("social_batches").select("*").eq("status", "submitted").order("created_at");
if (!batches?.length) {
  log("no pending batch");
  process.exit(0);
}

const renderer = new Renderer(sb);
const reelRenderer = new ReelRenderer(sb);
const { count: reelCount } = await sb.from("social_posts").select("id", { count: "exact", head: true }).eq("post_type", "reel");
let reelOrdinal = reelCount ?? 0;

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: n }, async () => {
      for (let x = queue.shift(); x; x = queue.shift()) await fn(x);
    }),
  );
}

try {
  for (const b of batches) {
    const remote = await client.batches.retrieve(b.openai_batch_id);
    await sb.from("social_batches").update({ last_checked_at: new Date().toISOString() }).eq("id", b.id);
    const counts = remote.request_counts;
    log(`batch ${b.openai_batch_id} (${b.target_date}): ${remote.status} ${counts ? `${counts.completed}/${counts.total} done, ${counts.failed} failed` : ""}`);
    const finished = ["completed", "failed", "expired", "cancelled"].includes(remote.status);
    const late = forceFallback || new Date() >= fallbackAt(b.created_at);
    if (!finished && !late) continue;
    if (!finished) {
      log(`batch not finished by ${fallbackAt(b.created_at).toISOString()} → cancelling it and falling back to normal API calls`);
      try {
        await client.batches.cancel(b.openai_batch_id);
      } catch (e) {
        log("cancel failed (ignored):", (e as Error).message);
      }
    }
    const results = finished ? await readBatchResults(client, remote) : new Map();

    const ids = Object.keys(b.items as Record<string, { mode: CaptionMode }>);
    const { data: pending } = await sb.from("social_posts").select("*").in("id", ids).eq("status", "draft").is("image_url", null);
    log(`${pending?.length ?? 0} post(s) to finish for ${b.target_date}`);
    const dup = makeDuplicateChecker(await loadRecentTexts(sb));
    let viaBatch = 0;
    let viaApi = 0;
    const work = (pending ?? []) as SocialPostRow[];
    await pool(work, 4, async (row) => {
      const meta = (b.items as Record<string, { mode: CaptionMode }>)[row.id];
      const product = await loadProduct(sb, row.product_id!);
      let precomputed: CaptionJson | undefined;
      const res = results.get(row.id);
      if (res?.text) {
        recordUsage(`${row.post_type} ${product.name_ar.slice(0, 18)} [${meta.mode}]`, res.usage, true);
        try {
          const checked = checkCaptionJson(parseModelText(res.text), meta.mode, product, settings, dup);
          if (checked.json) {
            precomputed = checked.json;
            dup.add(checked.json);
          } else log(`batch answer rejected for ${product.name_ar.slice(0, 24)}: ${checked.reason} → normal call`);
        } catch (e) {
          log(`batch answer unreadable for ${product.name_ar.slice(0, 24)}: ${(e as Error).message} → normal call`);
        }
      } else if (res?.error) log(`batch error for ${product.name_ar.slice(0, 24)}: ${res.error} → normal call`);
      precomputed ? viaBatch++ : viaApi++;
      const musicIndex = row.post_type === "reel" ? reelOrdinal++ : 0;
      await completePost(sb, { renderer, reelRenderer }, settings, cats, row, product, {
        label: `${row.post_type} «${product.name_ar}» (${row.angle})${precomputed ? " [batch]" : " [api]"}`,
        musicIndex,
        precomputed,
      });
    });
    await sb.from("social_batches").update({ status: "collected", collected_at: new Date().toISOString() }).eq("id", b.id);
    log(`batch ${b.openai_batch_id} collected: ${viaBatch} from the batch, ${viaApi} via normal calls`);
  }
} finally {
  await renderer.close();
  await reelRenderer.close();
}
if (usageLog.length) log(`OpenAI this run: ${usageLog.length} call(s) ≈ $${usageLog.reduce((a, u) => a + u.cost, 0).toFixed(4)}`);
process.exit(0);
