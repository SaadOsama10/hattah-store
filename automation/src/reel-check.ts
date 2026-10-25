// Validates a stored reel against Instagram WITHOUT publishing: creates a REELS container and waits for FINISHED.
// Usage: tsx src/reel-check.ts <social_posts.id>
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { checkCarouselContainer, checkReelContainer } from "./meta.js";

loadEnv();
const id = process.argv[2];
if (!id) throw new Error("post id required");
const { data: post, error } = await getSupabase().from("social_posts").select("video_url, image_url, post_type, slides, caption_full").eq("id", id).single();
if (post?.post_type === "carousel") {
  const settings = await getSupabase().from("social_settings").select("location_id").eq("id", 1).single();
  const c = await checkCarouselContainer(post.slides as string[], post.caption_full, settings.data?.location_id);
  console.log(`OK — Instagram accepted the carousel (${(post.slides as string[]).length} slides, container ${c}, not published).`);
  process.exit(0);
}
if (error || !post?.video_url) throw new Error(`no video for ${id}: ${error?.message ?? "video_url empty"}`);
const container = await checkReelContainer(post.video_url, post.image_url, post.post_type === "story");
console.log(`OK — Instagram accepted the reel (container ${container}, not published).`);
process.exit(0);
