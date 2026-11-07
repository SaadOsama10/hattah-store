// Builds (or rebuilds) everything a MANUAL post needs: text (model or the owner's own) + image / carousel / reel / story video.
// The owner prepares it in /admin/social/new; the wizard polls `render_state` on the row.
// Usage: tsx src/manual.ts --post=<uuid>
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { Renderer } from "./render/render.js";
import { ReelRenderer } from "./render/reel.js";
import { log } from "./time.js";
import { applyManualParams, buildCarouselAssets, buildPostAssets, buildReelAssets, loadCategories, loadProduct, loadSettings, manualTrack } from "./pipeline.js";
import { usageLog } from "./captions.js";
import type { ManualParams, SocialPostRow } from "./types.js";

loadEnv();
const postId = process.argv.find((a) => a.startsWith("--post="))?.slice(7);
if (!postId) throw new Error("--post is required");

const sb = getSupabase();
const setState = async (patch: Record<string, unknown>) => {
  const { error } = await sb.from("social_posts").update({ ...patch, render_updated_at: new Date().toISOString() }).eq("id", postId);
  if (error) log("render_state update failed:", error.message);
};

let renderer: Renderer | undefined;
let reelRenderer: ReelRenderer | undefined;
let exitCode = 0;
try {
  const { data, error } = await sb.from("social_posts").select("*").eq("id", postId).single();
  if (error || !data) throw new Error(`post not found: ${error?.message}`);
  const row = data as SocialPostRow;
  if (!row.is_manual) throw new Error("not a manual post");
  if (!["composing", "draft", "approved", "failed"].includes(row.status)) throw new Error(`post is ${row.status}; cannot rebuild`);
  const params = (row.manual_params ?? {}) as Partial<ManualParams>;
  if (!row.product_id) throw new Error("manual post has no product");
  await setState({ render_state: "running", render_error: null });

  const settings = await loadSettings(sb);
  const cats = await loadCategories(sb);
  const product = applyManualParams(await loadProduct(sb, row.product_id), params as ManualParams);
  const track = manualTrack(params as ManualParams);
  if (params.music && !track) throw new Error(`unknown music track: ${params.music}`);

  // "render" / owner-written text → reuse what is stored on the row; "full" → the model writes new text (normal API call, not Batch).
  const keepText = params.text_mode === "manual" || params.op === "render";
  const stored = row.design?.headline && row.design?.subline ? { headline: row.design.headline, subline: row.design.subline } : null;
  if (keepText && !stored) throw new Error("لا يوجد نص تصميم محفوظ (العنوان والسطر الفرعي)");
  if (keepText && row.post_type !== "story" && !row.caption_full) throw new Error("لا يوجد كابشن محفوظ");
  const base = { ...row, design: keepText ? row.design : null, caption_full: keepText ? row.caption_full : null };

  let assets: Partial<SocialPostRow>;
  if (row.post_type === "carousel") {
    renderer = new Renderer(sb);
    assets = await buildCarouselAssets(sb, renderer, settings, cats, base, product, undefined, { reuseText: keepText });
  } else if (row.post_type === "reel") {
    reelRenderer = new ReelRenderer(sb);
    assets = await buildReelAssets(sb, reelRenderer, settings, cats, base, product, 0, false, undefined, {
      track,
      fixed: keepText ? { design: stored!, caption: row.caption_full } : undefined,
    });
  } else {
    renderer = new Renderer(sb);
    assets = await buildPostAssets(
      sb, renderer, settings, cats, base, product,
      { image: true, caption: row.post_type === "feed" && !keepText },
      undefined,
      { firstPhoto: true, track },
    );
  }
  // Reel/story/carousel builders only return what they changed; clear media that no longer applies after a type change.
  const cleared = { video_url: null, slides: null, music_track: null, ...assets };
  await setState({ ...cleared, render_state: "ready", render_error: null });
  log(`✓ manual ${row.post_type} ${postId} ready`);
} catch (e) {
  const msg = (e as Error).message;
  log(`✗ manual post failed: ${msg}`);
  await setState({ render_state: "failed", render_error: msg.slice(0, 500) });
  exitCode = 1;
} finally {
  await renderer?.close();
  await reelRenderer?.close();
}
if (usageLog.length) log(`OpenAI this run: ${usageLog.length} call(s) ≈ $${usageLog.reduce((a, u) => a + u.cost, 0).toFixed(4)}`);
// Explicit exit: leftover keep-alive sockets / browser handles must never hang the Actions job.
process.exit(exitCode);
