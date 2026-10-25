import type { SupabaseClient } from "@supabase/supabase-js";
import { Renderer } from "./render/render.js";
import { ReelRenderer, REEL_SECONDS } from "./render/reel.js";
import { chooseTrack, musicStartFor, trackFile } from "./music.js";
import { STORY_SECONDS, renderStoryVideo } from "./render/story.js";
import { CTA_POOL, ctaIndexOf, generateCaption, resultFromJson, type CaptionJson, type CaptionMode } from "./captions.js";
import { buildTagSet, countRecentUse, parseTags } from "./hashtags.js";
import { renderDetailsSlide, renderPhotoSlide } from "./render/carousel.js";
import { SOCIAL_BUCKET } from "./db.js";
import { effectivePrice, sortedImages } from "./products.js";
import { ANGLES, type Angle, type ProductRecord, type SocialPostRow, type SocialSettings } from "./types.js";
import { log } from "./time.js";

export const PRODUCT_SELECT =
  "*, product_images(image_url, sort_order), product_sizes(label), product_colors(label_ar, label_en), product_quantities(label_ar, label_en, price)";

export async function loadSettings(sb: SupabaseClient): Promise<SocialSettings> {
  const { data, error } = await sb.from("social_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(`social_settings: ${error.message}`);
  return data as SocialSettings;
}

export async function loadCategories(sb: SupabaseClient): Promise<Map<string, { label_ar: string; parent_key: string | null }>> {
  const { data, error } = await sb.from("categories").select("key,label_ar,parent_key");
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((c: any) => [c.key, c]));
}

/** Headlines/sublines used on posts in the last 30 days (to avoid repeats). */
export async function loadRecentTexts(sb: SupabaseClient, excludePostId?: string, productId?: string): Promise<string[]> {
  const since = new Date(Date.now() - 30 * 86400e3).toISOString();
  const { data } = await sb.from("social_posts").select("id, design").gte("created_at", since).not("design", "is", null);
  const out: string[] = [];
  for (const r of data ?? []) {
    if (r.id === excludePostId) continue;
    const d = r.design as { headline?: string; subline?: string };
    if (d?.headline) out.push(d.headline);
    if (d?.subline) out.push(d.subline);
  }
  // Whatever a product said last time is never reused, even outside the 30-day window.
  if (productId) {
    const { data: own } = await sb
      .from("social_posts")
      .select("id, design")
      .eq("product_id", productId)
      .not("design", "is", null)
      .order("created_at", { ascending: false })
      .limit(4);
    for (const r of own ?? []) {
      if (r.id === excludePostId) continue;
      const d = r.design as { headline?: string; subline?: string };
      if (d?.headline) out.push(d.headline);
      if (d?.subline) out.push(d.subline);
    }
  }
  return out;
}

/** The last ~10 headlines used for this product and/or this angle — shown to the model as "don't repeat" hints (the real duplicate check runs in code). */
export async function loadAvoidHints(sb: SupabaseClient, productId: string, angle: string, excludePostId?: string): Promise<string[]> {
  const out: string[] = [];
  const push = (rows: any[] | null) => {
    for (const r of rows ?? []) {
      const h = (r.design as { headline?: string } | null)?.headline?.trim();
      if (r.id !== excludePostId && h && !out.includes(h)) out.push(h);
    }
  };
  const { data: own } = await sb.from("social_posts").select("id, design").eq("product_id", productId).not("design", "is", null).order("created_at", { ascending: false }).limit(6);
  push(own);
  const { data: same } = await sb.from("social_posts").select("id, design").eq("angle", angle).not("design", "is", null).order("created_at", { ascending: false }).limit(8);
  push(same);
  return out.slice(0, 10);
}

/** Hashtag line for one post: 3 big + 4 medium + 3 niche (ar/tr/en), least-recently-used first, never the exact set of another post the same Istanbul day. */
export function makeTagPicker(sb: SupabaseClient, scheduledAt: string | null, postId: string) {
  return async (productTags: string[]): Promise<string[]> => {
    const at = new Date(scheduledAt ?? Date.now());
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(at);
    const start = new Date(`${day}T00:00:00+03:00`);
    const { data: today } = await sb
      .from("social_posts")
      .select("id, caption_full")
      .gte("scheduled_at", start.toISOString())
      .lt("scheduled_at", new Date(start.getTime() + 86400e3).toISOString())
      .not("caption_full", "is", null)
      .neq("id", postId);
    const { data: recent } = await sb
      .from("social_posts")
      .select("caption_full")
      .gte("scheduled_at", new Date(start.getTime() - 3 * 86400e3).toISOString())
      .not("caption_full", "is", null)
      .neq("id", postId);
    return buildTagSet(productTags, {
      daySets: (today ?? []).map((r) => parseTags(r.caption_full)).filter((t) => t.length),
      recentUse: countRecentUse((recent ?? []).map((r) => r.caption_full)),
    });
  };
}

/** In-process reservations so parallel jobs of one run never pick the same phrasing. */
const reservedCtas = new Map<string, Set<number>>();

/** A CTA phrasing not yet used by another post on the same Istanbul day (never the same sentence twice in a day). */
export async function pickCtaIndex(sb: SupabaseClient, scheduledAt: string | null, excludePostId: string): Promise<number> {
  const at = new Date(scheduledAt ?? Date.now());
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(at);
  const start = new Date(`${day}T00:00:00+03:00`);
  const end = new Date(start.getTime() + 86400e3);
  const { data } = await sb
    .from("social_posts")
    .select("id, caption_full")
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString())
    .not("caption_full", "is", null);
  const used = new Set((data ?? []).filter((r) => r.id !== excludePostId).map((r) => ctaIndexOf(r.caption_full)));
  const reserved = reservedCtas.get(day) ?? new Set<number>();
  reservedCtas.set(day, reserved);
  const all = CTA_POOL.map((_, i) => i);
  const free = all.filter((i) => !used.has(i) && !reserved.has(i));
  const pool = free.length ? free : all.filter((i) => !reserved.has(i)).length ? all.filter((i) => !reserved.has(i)) : all;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  reserved.add(pick);
  return pick;
}

export async function loadProduct(sb: SupabaseClient, id: string): Promise<ProductRecord> {
  const { data, error } = await sb.from("products").select(PRODUCT_SELECT).eq("id", id).single();
  if (error) throw new Error(`product ${id}: ${error.message}`);
  return data as unknown as ProductRecord;
}

/** Products with the per-product "remove background" option switched on. */
export async function loadRemoveBgIds(sb: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await sb.from("social_product_settings").select("product_id").eq("remove_bg", true);
  if (error) {
    log("social_product_settings unavailable (migration 014 not applied?):", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r: any) => r.product_id));
}

const shuffle = <T>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

/** Top-level category of a product, so "same category" means the family. */
function family(cats: Map<string, { parent_key: string | null }>, key: string) {
  return cats.get(key)?.parent_key ?? key;
}

export interface ProductPick {
  product: ProductRecord;
  angle: Angle;
}

/** Picks `count` distinct products, least-recently-posted first (never posted
 * first), avoiding the same category family back-to-back where possible, and
 * varying the angle per product. */
export const ANGLE_LIST = ANGLES;

export async function pickProducts(
  sb: SupabaseClient,
  settings: SocialSettings,
  cats: Map<string, { label_ar: string; parent_key: string | null }>,
  count: number,
  opts: { excludeIds?: string[]; previousCategory?: string | null; slotTypes?: ("feed" | "story" | "reel" | "carousel")[]; rotationDays?: number | "auto"; minImages?: number } = {},
): Promise<ProductPick[]> {
  const { data: prods, error } = await sb.from("products").select(PRODUCT_SELECT);
  if (error) throw new Error(error.message);
  const excluded = new Set([...(settings.excluded_product_ids ?? []), ...(opts.excludeIds ?? [])]);
  const eligible = (prods as unknown as ProductRecord[]).filter(
    (p) => !excluded.has(p.id) && sortedImages(p).length >= (opts.minImages ?? 1),
  );

  const { data: hist } = await sb
    .from("social_posts")
    .select("product_id, angle, scheduled_at, status")
    .not("product_id", "is", null)
    .neq("status", "skipped")
    .order("scheduled_at", { ascending: false });
  const lastPosted = new Map<string, number>();
  // Feed rotation: a product that appeared in a feed post within the last N days is out
  // (N = eligible/6, min 3) — relaxed only if that would leave too few candidates.
  const recentFeed = new Set<string>();
  const rotationDays = opts.rotationDays === "auto" ? Math.max(3, Math.ceil(eligible.length / 6)) : opts.rotationDays;
  if (rotationDays) {
    const since = Date.now() - rotationDays * 86400e3;
    const { data: feedHist } = await sb
      .from("social_posts")
      .select("product_id, scheduled_at")
      .eq("post_type", "feed")
      .not("product_id", "is", null)
      .not("status", "in", "(skipped,failed)")
      .gte("scheduled_at", new Date(since).toISOString());
    for (const h of feedHist ?? []) recentFeed.add(h.product_id);
  }
  const lastAngle = new Map<string, Angle>();
  for (const h of hist ?? []) {
    if (!lastPosted.has(h.product_id)) {
      lastPosted.set(h.product_id, new Date(h.scheduled_at).getTime());
      lastAngle.set(h.product_id, h.angle);
    }
  }

  // never posted (-Infinity) first, then oldest; shuffle first so ties vary.
  const ordered = shuffle(eligible).sort(
    (a, b) => (lastPosted.get(a.id) ?? -Infinity) - (lastPosted.get(b.id) ?? -Infinity),
  );
  const fresh = ordered.filter((p) => !recentFeed.has(p.id));
  const pool = fresh.length >= count ? fresh : [...fresh, ...ordered.filter((p) => recentFeed.has(p.id))];
  if (fresh.length < count) log(`rotation window relaxed: only ${fresh.length} product(s) outside the last ${rotationDays} days`);

  const picks: ProductPick[] = [];
  const usedAngles: Angle[] = [];
  let prevFamily = opts.previousCategory ? family(cats, opts.previousCategory) : null;
  for (let i = 0; i < count; i++) {
    // Look only at the freshest candidates so the rotation stays fair, but
    // among them prefer a different category family than the previous pick.
    const window = pool.slice(0, Math.max(8, count * 3));
    const chosen = window.find((p) => family(cats, p.category) !== prevFamily) ?? pool[0];
    if (!chosen) break;
    pool.splice(pool.indexOf(chosen), 1);

    const onSale = effectivePrice(chosen).old != null;
    const prefer = ANGLES.filter((a) => a !== lastAngle.get(chosen.id) && !usedAngles.includes(a));
    const order = shuffle(prefer.length ? prefer : ANGLES.filter((a) => a !== lastAngle.get(chosen.id)));
    // A product that is actually on sale gets the offer angle when possible.
    const angle = onSale && order.includes("offer") ? "offer" : (order[0] ?? "showcase");
    usedAngles.push(angle);
    prevFamily = family(cats, chosen.category);
    picks.push({ product: chosen, angle });
  }
  return picks;
}

/** Renders the image, uploads it to the public bucket, and (for feed posts)
 * writes the caption. Returns the fields to save on the row. */
export async function buildPostAssets(
  sb: SupabaseClient,
  renderer: Renderer,
  settings: SocialSettings,
  cats: Map<string, { label_ar: string; parent_key: string | null }>,
  post: Pick<SocialPostRow, "id" | "post_type" | "angle" | "design">,
  product: ProductRecord,
  what: { image: boolean; caption: boolean },
  precomputed?: CaptionJson,
): Promise<Partial<SocialPostRow>> {
  const categoryAr = cats.get(product.category)?.label_ar ?? "";
  const out: Partial<SocialPostRow> = {};
  let design = post.design ?? {};

  // One model call writes the caption AND the on-image text, so they match.
  // For image-only re-renders we reuse the stored text (editable in admin),
  // generating it only if the post has none yet.
  const needText = what.image && !(design.headline && design.subline);
  if (what.caption || needText) {
    // Feed captions need the full output; everything else (stories, image-only re-renders) only needs the on-image text.
    const mode: CaptionMode = post.post_type === "feed" && what.caption ? "full" : "design";
    const ctaIndex = mode === "full" ? await pickCtaIndex(sb, (post as { scheduled_at?: string }).scheduled_at ?? null, post.id) : 0;
    const res = precomputed
      ? resultFromJson(precomputed, settings, ctaIndex, mode, mode === "full" ? await makeTagPicker(sb, (post as { scheduled_at?: string }).scheduled_at ?? null, post.id)(precomputed.hashtags) : undefined)
      : await generateCaption(
          product,
          categoryAr,
          post.angle,
          settings,
          { mode, avoid: await loadAvoidHints(sb, product.id, post.angle, post.id), recent: await loadRecentTexts(sb, post.id, product.id), label: `${post.post_type} ${product.name_ar.slice(0, 18)}`, tagPicker: makeTagPicker(sb, (post as { scheduled_at?: string }).scheduled_at ?? null, post.id) },
          ctaIndex,
        );
    design = res.design;
    out.design = design;
    if (mode === "full") out.caption_full = res.caption;
  }

  if (what.image) {
    const price = effectivePrice(product);
    const req = {
      type: post.post_type,
      angle: post.angle,
      nameAr: product.name_ar,
      categoryAr,
      price: price.current,
      oldPrice: price.old,
      // Stories prefer the product's second photo so they don't look like a copy of the feed post.
      photoUrl: sortedImages(product)[post.post_type === "story" && sortedImages(product).length > 1 ? 1 : 0],
      text: { headline: design.headline ?? "", subline: design.subline ?? "" },
      storeUrl: settings.store_url,
      removeBg: (await loadRemoveBgIds(sb)).has(product.id),
    };
    const day = new Date().toISOString().slice(0, 10);
    const base = `${day}/${post.id}-${Date.now()}`;
    const upload = async (ext: string, body: Buffer, contentType: string) => {
      const { error } = await sb.storage.from(SOCIAL_BUCKET).upload(`${base}.${ext}`, body, { contentType, upsert: false });
      if (error) throw new Error(`upload ${ext}: ${error.message}`);
      return sb.storage.from(SOCIAL_BUCKET).getPublicUrl(`${base}.${ext}`).data.publicUrl;
    };
    if (post.post_type === "story" && process.env.STORY_VIDEO !== "false") {
      // Stories are short animated videos (7 s) with music; the cover frame doubles as the admin preview image.
      const track = await chooseTrack(sb, (post as { scheduled_at?: string }).scheduled_at ?? null, post.id, "story");
      const musicFile = await trackFile(sb, track);
      const start = musicStartFor(track, [...post.id].reduce((a, c) => a + c.charCodeAt(0), 0), STORY_SECONDS);
      const { video, cover } = await renderStoryVideo(renderer, req, musicFile, start);
      out.video_url = await upload("mp4", video, "video/mp4");
      out.image_url = await upload("jpg", cover, "image/jpeg");
      out.music_track = track.file;
      log(`story video uploaded (${(video.length / 1e6).toFixed(1)} MB) ♪ ${track.title}`, out.video_url);
    } else {
      out.image_url = await upload("jpg", await renderer.render(req), "image/jpeg");
      log("image uploaded", out.image_url);
    }
  }
  return out;
}

/** Renders a reel (MP4 + cover frame), uploads both, and writes the caption and the on-screen hook with one model call.
 * `musicIndex` rotates through the licensed tracks. */
export async function buildReelAssets(
  sb: SupabaseClient,
  renderer: ReelRenderer,
  settings: SocialSettings,
  cats: Map<string, { label_ar: string; parent_key: string | null }>,
  post: Pick<SocialPostRow, "id" | "angle" | "design"> & { scheduled_at?: string },
  product: ProductRecord,
  musicIndex: number,
  keepCaption = false,
  precomputed?: CaptionJson,
): Promise<Partial<SocialPostRow>> {
  const categoryAr = cats.get(product.category)?.label_ar ?? "";
  const ctaIndex = await pickCtaIndex(sb, post.scheduled_at ?? null, post.id);
  const mode: CaptionMode = keepCaption ? "design" : "full"; // to-reel keeps the feed caption, only the on-screen text is new
  const res = precomputed
    ? resultFromJson(precomputed, settings, ctaIndex, mode, mode === "full" ? await makeTagPicker(sb, post.scheduled_at ?? null, post.id)(precomputed.hashtags) : undefined)
    : await generateCaption(
        product,
        categoryAr,
        post.angle,
        settings,
        { mode, avoid: await loadAvoidHints(sb, product.id, post.angle, post.id), recent: await loadRecentTexts(sb, post.id, product.id), label: `reel ${product.name_ar.slice(0, 18)}`, tagPicker: makeTagPicker(sb, post.scheduled_at ?? null, post.id) },
        ctaIndex,
      );
  const price = effectivePrice(product);
  const imgs = sortedImages(product);
  const track = await chooseTrack(sb, post.scheduled_at ?? null, post.id);
  const music = await trackFile(sb, track);
  const musicStart = musicStartFor(track, musicIndex, REEL_SECONDS);
  log(`reel «${product.name_ar}» ♪ ${track.title} (${track.bpm} bpm, +${musicStart.toFixed(2)}s)`);
  const { video, cover, timing } = await renderer.render(
    {
      nameAr: product.name_ar,
      categoryAr,
      price: price.current,
      oldPrice: price.old,
      photoUrls: imgs,
      removeBg: (await loadRemoveBgIds(sb)).has(product.id),
      text: res.design,
      storeUrl: settings.store_url,
    },
    music,
    musicStart,
    track.bpm,
  );
  const day = new Date().toISOString().slice(0, 10);
  const base = `${day}/${post.id}-${Date.now()}`;
  const up = async (ext: string, body: Buffer, contentType: string) => {
    const { error } = await sb.storage.from(SOCIAL_BUCKET).upload(`${base}.${ext}`, body, { contentType, upsert: false });
    if (error) throw new Error(`upload ${ext}: ${error.message}`);
    return sb.storage.from(SOCIAL_BUCKET).getPublicUrl(`${base}.${ext}`).data.publicUrl;
  };
  const video_url = await up("mp4", video, "video/mp4");
  const image_url = await up("jpg", cover, "image/jpeg");
  log(`reel uploaded (${(video.length / 1e6).toFixed(1)} MB, ${timing.seconds.toFixed(1)}s)`, video_url);
  return { video_url, image_url, music_track: track.file, ...(keepCaption ? {} : { caption_full: res.caption }), design: res.design };
}

/** Builds a carousel: hero design slide + extra product photos + a details slide, all 1080×1350 (4:5), plus the full caption. */
export async function buildCarouselAssets(
  sb: SupabaseClient,
  renderer: Renderer,
  settings: SocialSettings,
  cats: Map<string, { label_ar: string; parent_key: string | null }>,
  post: Pick<SocialPostRow, "id" | "angle" | "design"> & { scheduled_at?: string; caption_full?: string | null },
  product: ProductRecord,
  precomputed?: CaptionJson,
  opts: { reuseText?: boolean } = {},
): Promise<Partial<SocialPostRow>> {
  const categoryAr = cats.get(product.category)?.label_ar ?? "";
  const ctaIndex = await pickCtaIndex(sb, post.scheduled_at ?? null, post.id);
  const picker = makeTagPicker(sb, post.scheduled_at ?? null, post.id);
  // Design-only re-render: keep the caption and the on-image texts exactly as they are (no model call).
  const kept = opts.reuseText && post.caption_full && post.design?.headline && post.design?.subline;
  const res = kept
    ? {
        caption: post.caption_full!,
        design: { headline: post.design!.headline!, subline: post.design!.subline! },
        details: (post.caption_full!.split("\n\n").find((p) => p.split("\n").length >= 2 && p.split("\n").every((l) => /^[^\p{L}\p{N}]/u.test(l.trim()))) ?? "").split("\n").filter(Boolean),
      }
    : precomputed
    ? resultFromJson(precomputed, settings, ctaIndex, "full", await picker(precomputed.hashtags))
    : await generateCaption(
        product,
        categoryAr,
        post.angle,
        settings,
        { mode: "full", avoid: await loadAvoidHints(sb, product.id, post.angle, post.id), recent: await loadRecentTexts(sb, post.id, product.id), label: `carousel ${product.name_ar.slice(0, 18)}`, tagPicker: picker },
        ctaIndex,
      );
  const imgs = sortedImages(product);
  const extra = imgs.slice(1, 4); // up to 3 more photos → 3–5 slides in total
  const total = 1 + extra.length + 1;
  const price = effectivePrice(product);
  const hero = await renderer.render({
    type: "feed", // same 1080×1350 design as a feed post
    angle: post.angle,
    nameAr: product.name_ar,
    categoryAr,
    price: price.current,
    oldPrice: price.old,
    photoUrl: imgs[0],
    text: res.design,
    storeUrl: settings.store_url,
    removeBg: (await loadRemoveBgIds(sb)).has(product.id),
    swipeCue: true,
  });
  const buffers: Buffer[] = [hero];
  for (const [i, url] of extra.entries()) {
    buffers.push(await renderPhotoSlide(renderer, { photoUrl: url, nameAr: product.name_ar, index: i + 1, total, storeUrl: settings.store_url, variant: i + 1, flowIn: i === 0 }));
  }
  const options = [
    ...product.product_sizes.map((x) => x.label),
    ...product.product_colors.map((c) => c.label_ar),
    ...product.product_quantities.map((q) => `${q.label_ar} — ${q.price} TL`),
  ];
  buffers.push(
    await renderDetailsSlide(renderer, {
      nameAr: product.name_ar,
      categoryAr,
      price: price.current,
      oldPrice: price.old,
      details: res.details.length ? res.details : [],
      options,
      index: total - 1,
      total,
      storeUrl: settings.store_url,
    }),
  );
  const day = new Date().toISOString().slice(0, 10);
  const stamp = Date.now();
  const slides: string[] = [];
  for (const [i, b] of buffers.entries()) {
    const path = `${day}/${post.id}-${stamp}-s${i + 1}.jpg`;
    const { error } = await sb.storage.from(SOCIAL_BUCKET).upload(path, b, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error(`upload slide ${i + 1}: ${error.message}`);
    slides.push(sb.storage.from(SOCIAL_BUCKET).getPublicUrl(path).data.publicUrl);
  }
  log(`carousel «${product.name_ar}»: ${slides.length} slides uploaded`);
  return { slides, image_url: slides[0], ...(kept ? {} : { caption_full: res.caption, design: res.design }) };
}

export interface Renderers {
  renderer: Renderer;
  reelRenderer: ReelRenderer;
}

/** Builds everything a freshly inserted post row still needs (text, image or reel), saves it and sets its status.
 * Two attempts; a slot that cannot be built is marked `skipped` with the error (visible in the admin history).
 * `precomputed` = the model answer already obtained through the Batch API. */
export async function completePost(
  sb: SupabaseClient,
  r: Renderers,
  settings: SocialSettings,
  cats: Map<string, { label_ar: string; parent_key: string | null }>,
  row: SocialPostRow,
  product: ProductRecord,
  o: { label: string; musicIndex?: number; precomputed?: CaptionJson },
): Promise<boolean> {
  // Test days (generate.ts --test) are never left publishable: they end up `skipped`.
  const status = row.error === "TEST" ? "skipped" : settings.auto_approve ? "approved" : "draft";
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const assets =
        row.post_type === "carousel"
          ? await buildCarouselAssets(sb, r.renderer, settings, cats, row, product, attempt === 1 ? o.precomputed : undefined)
          : row.post_type === "reel"
          ? await buildReelAssets(sb, r.reelRenderer, settings, cats, row, product, o.musicIndex ?? 0, false, attempt === 1 ? o.precomputed : undefined)
          : await buildPostAssets(sb, r.renderer, settings, cats, row, product, { image: true, caption: row.post_type === "feed" }, attempt === 1 ? o.precomputed : undefined);
      const { error } = await sb.from("social_posts").update({ ...assets, status }).eq("id", row.id);
      if (error) throw new Error(error.message);
      log(`✓ ${o.label}`);
      return true;
    } catch (e) {
      lastErr = (e as Error).message;
      log(`… ${o.label} attempt ${attempt}/2 failed: ${lastErr}`);
    }
  }
  await sb.from("social_posts").update({ status: "skipped", error: `generation failed: ${lastErr}`.slice(0, 500) }).eq("id", row.id);
  log(`✗ SKIPPED ${o.label}`);
  return false;
}
