// Validates a stored reel against Instagram WITHOUT publishing: creates a REELS container and waits for FINISHED.
// Usage: tsx src/reel-check.ts <social_posts.id>
import { loadEnv } from "./env.js";
import { getSupabase } from "./db.js";
import { checkReelContainer } from "./meta.js";

loadEnv();
const id = process.argv[2];
if (!id) throw new Error("post id required");
const { data: post, error } = await getSupabase().from("social_posts").select("video_url, image_url, post_type").eq("id", id).single();
if (error || !post?.video_url) throw new Error(`no video for ${id}: ${error?.message ?? "video_url empty"}`);
const container = await checkReelContainer(post.video_url, post.image_url, post.post_type === "story");
console.log(`OK — Instagram accepted the reel (container ${container}, not published).`);
process.exit(0);
