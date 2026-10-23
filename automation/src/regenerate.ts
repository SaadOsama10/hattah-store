// Re-creates parts of one post. Usage: tsx src/regenerate.ts --post=<uuid> --what=image|caption|both|swap
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { Renderer } from "./render/render.js";
import { log } from "./time.js";
import { buildPostAssets, loadCategories, loadProduct, loadSettings, pickProducts } from "./pipeline.js";

loadEnv();
const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const postId = arg("post");
const what = arg("what") ?? "both";
if (!postId) throw new Error("--post is required");

const sb = getSupabase();
const settings = await loadSettings(sb);
const cats = await loadCategories(sb);
const { data: post, error } = await sb.from("social_posts").select("*").eq("id", postId).single();
if (error || !post) throw new Error(`post not found: ${error?.message}`);
if (["publishing", "published"].includes(post.status)) throw new Error(`post is ${post.status}; cannot regenerate`);

let productId = post.product_id as string;
let angle = post.angle;
let design = post.design;
if (what === "swap") {
  const dayStart = new Date(post.scheduled_at);
  dayStart.setUTCHours(0, 0, 0, 0);
  const { data: sameDay } = await sb
    .from("social_posts")
    .select("product_id")
    .gte("scheduled_at", new Date(dayStart.getTime() - 3 * 3600e3).toISOString())
    .lt("scheduled_at", new Date(dayStart.getTime() + 21 * 3600e3).toISOString());
  const [pick] = await pickProducts(sb, settings, cats, 1, {
    excludeIds: [...(sameDay ?? []).map((r) => r.product_id), productId].filter(Boolean),
  });
  if (!pick) throw new Error("no other eligible product to swap in");
  productId = pick.product.id;
  angle = pick.angle;
  design = null;
  log(`swapping to «${pick.product.name_ar}» (${angle})`);
}

const product = await loadProduct(sb, productId);
const renderer = new Renderer();
try {
  const image = what === "image" || what === "both" || what === "swap";
  const caption = what === "caption" || what === "both" || what === "swap";
  const assets = await buildPostAssets(sb, renderer, settings, cats, { ...post, angle, design }, product, {
    image,
    caption: caption || (what === "image" && false),
  });
  const patch: Record<string, unknown> = { ...assets, product_id: productId, angle, error: null, attempts: 0 };
  if (post.status === "failed") patch.status = "draft";
  if (what === "swap") patch.status = "draft";
  const { error: upErr } = await sb.from("social_posts").update(patch).eq("id", postId);
  if (upErr) throw new Error(upErr.message);
  log("regenerated", what);
} finally {
  await renderer.close();
}
