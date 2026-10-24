import { need } from "./env.js";
import { log, sleep } from "./time.js";

const VERSION = () => process.env.META_GRAPH_VERSION || "v25.0";
const base = () => `https://graph.facebook.com/${VERSION()}`;

export class MetaError extends Error {
  constructor(message: string, public retryable: boolean, public code?: number) {
    super(message);
  }
}

async function graph(method: "GET" | "POST", path: string, params: Record<string, string>, token: string) {
  const url = new URL(`${base()}/${path}`);
  const body = new URLSearchParams();
  const target = method === "GET" ? url.searchParams : body;
  for (const [k, v] of Object.entries(params)) target.set(k, v);
  target.set("access_token", token);
  const res = await fetch(url, { method, body: method === "POST" ? body : undefined });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error ?? {};
    // 4 / 17 / 32 / 613 = rate limits, 1 / 2 = transient; 5xx also transient.
    const retryable = res.status >= 500 || [1, 2, 4, 17, 32, 341, 613].includes(e.code);
    throw new MetaError(`Meta ${path}: ${e.message ?? res.statusText} (code ${e.code ?? res.status}${e.error_subcode ? "/" + e.error_subcode : ""})`, retryable, e.code);
  }
  return json;
}

export type IgMedia =
  | { kind: "feed"; imageUrl: string; caption: string | null }
  | { kind: "story"; imageUrl: string }
  | { kind: "reel"; videoUrl: string; caption: string | null; coverUrl?: string | null };

export async function publishInstagram(media: IgMedia): Promise<{ id: string; permalink: string | null }> {
  const igId = need("META_IG_USER_ID");
  const token = need("META_ACCESS_TOKEN");
  const params: Record<string, string> = {};
  if (media.kind === "reel") {
    params.media_type = "REELS";
    params.video_url = media.videoUrl;
    params.share_to_feed = "true";
    if (media.caption) params.caption = media.caption;
    if (media.coverUrl) params.cover_url = media.coverUrl;
  } else {
    params.image_url = media.imageUrl;
    if (media.kind === "story") params.media_type = "STORIES";
    else if (media.caption) params.caption = media.caption;
  }
  const container = await graph("POST", `${igId}/media`, params, token);
  log("IG container", container.id);

  // Poll until the container is processed: images ~2 min, videos up to ~10 min.
  const tries = media.kind === "reel" ? 60 : 24;
  const wait = media.kind === "reel" ? 10000 : 5000;
  for (let i = 0; i < tries; i++) {
    const s = await graph("GET", container.id, { fields: "status_code,status" }, token);
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new MetaError(`IG container ${s.status_code}: ${s.status ?? ""}`, false);
    if (i === tries - 1) throw new MetaError(`IG container still processing after ${Math.round((tries * wait) / 60000)} min`, true);
    await sleep(wait);
  }
  const pub = await graph("POST", `${igId}/media_publish`, { creation_id: container.id }, token);
  let permalink: string | null = null;
  try {
    permalink = (await graph("GET", pub.id, { fields: "permalink" }, token)).permalink ?? null;
  } catch {
    /* permalink is a nicety */
  }
  return { id: pub.id, permalink };
}

/** A System User token can read the Page's own access token, which is what
 * /photos publishing needs; fall back to the token itself. */
async function pageToken(): Promise<string> {
  const token = need("META_ACCESS_TOKEN");
  try {
    const r = await graph("GET", need("META_PAGE_ID"), { fields: "access_token" }, token);
    return r.access_token || token;
  } catch {
    return token;
  }
}

export async function publishFacebook(imageUrl: string, caption: string): Promise<{ id: string }> {
  const r = await graph("POST", `${need("META_PAGE_ID")}/photos`, { url: imageUrl, caption, published: "true" }, await pageToken());
  return { id: r.post_id ?? r.id };
}

export async function testConnection() {
  const token = need("META_ACCESS_TOKEN");
  const out: Record<string, unknown> = { graphVersion: VERSION() };
  const ig = await graph("GET", need("META_IG_USER_ID"), { fields: "username,name" }, token);
  out.instagram = ig.username;
  const page = await graph("GET", need("META_PAGE_ID"), { fields: "name" }, token);
  out.page = page.name;
  return out;
}
