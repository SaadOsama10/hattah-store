import type { SupabaseClient } from "@supabase/supabase-js";
import { Renderer } from "./render/render.js";
import { generateCaption } from "./captions.js";
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
export async function loadRecentTexts(sb: SupabaseClient, excludePostId?: string): Promise<string[]> {
  const since = new Date(Date.now() - 30 * 86400e3).toISOString();
  const { data } = await sb.from("social_posts").select("id, design").gte("created_at", since).not("design", "is", null);
  const out: string[] = [];
  for (const r of data ?? []) {
    if (r.id === excludePostId) continue;
    const d = r.design as { headline?: string; subline?: string };
    if (d?.headline) out.push(d.headline);
    if (d?.subline) out.push(d.subline);
  }
  return out;
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
export async function pickProducts(
  sb: SupabaseClient,
  settings: SocialSettings,
  cats: Map<string, { label_ar: string; parent_key: string | null }>,
  count: number,
  opts: { excludeIds?: string[]; previousCategory?: string | null; slotTypes?: ("feed" | "story")[] } = {},
): Promise<ProductPick[]> {
  const { data: prods, error } = await sb.from("products").select(PRODUCT_SELECT);
  if (error) throw new Error(error.message);
  const excluded = new Set([...(settings.excluded_product_ids ?? []), ...(opts.excludeIds ?? [])]);
  const eligible = (prods as unknown as ProductRecord[]).filter(
    (p) => !excluded.has(p.id) && sortedImages(p).length > 0,
  );

  const { data: hist } = await sb
    .from("social_posts")
    .select("product_id, angle, scheduled_at, status")
    .not("product_id", "is", null)
    .neq("status", "skipped")
    .order("scheduled_at", { ascending: false });
  const lastPosted = new Map<string, number>();
  const lastAngle = new Map<string, Angle>();
  for (const h of hist ?? []) {
    if (!lastPosted.has(h.product_id)) {
      lastPosted.set(h.product_id, new Date(h.scheduled_at).getTime());
      lastAngle.set(h.product_id, h.angle);
    }
  }

  // never posted (-Infinity) first, then oldest; shuffle first so ties vary.
  const pool = shuffle(eligible).sort(
    (a, b) => (lastPosted.get(a.id) ?? -Infinity) - (lastPosted.get(b.id) ?? -Infinity),
  );

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
): Promise<Partial<SocialPostRow>> {
  const categoryAr = cats.get(product.category)?.label_ar ?? "";
  const out: Partial<SocialPostRow> = {};
  let design = post.design ?? {};

  // One model call writes the caption AND the on-image text, so they match.
  // For image-only re-renders we reuse the stored text (editable in admin),
  // generating it only if the post has none yet.
  const needText = what.image && !(design.headline && design.subline);
  if (what.caption || needText) {
    const res = await generateCaption(product, categoryAr, post.angle, settings, await loadRecentTexts(sb, post.id));
    design = res.design;
    out.design = design;
    if (post.post_type === "feed" && what.caption) out.caption_full = res.caption;
  }

  if (what.image) {
    const price = effectivePrice(product);
    const jpeg = await renderer.render({
      type: post.post_type,
      angle: post.angle,
      nameAr: product.name_ar,
      categoryAr,
      price: price.current,
      oldPrice: price.old,
      photoUrl: sortedImages(product)[0],
      text: { headline: design.headline ?? "", subline: design.subline ?? "" },
      removeBg: (await loadRemoveBgIds(sb)).has(product.id),
    });
    const day = new Date().toISOString().slice(0, 10);
    const path = `${day}/${post.id}-${Date.now()}.jpg`;
    const { error } = await sb.storage.from(SOCIAL_BUCKET).upload(path, jpeg, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error(`upload: ${error.message}`);
    out.image_url = sb.storage.from(SOCIAL_BUCKET).getPublicUrl(path).data.publicUrl;
    log("image uploaded", out.image_url);
  }
  return out;
}
