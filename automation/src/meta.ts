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
  | { kind: "feed"; imageUrl: string; caption: string | null; locationId?: string | null }
  | { kind: "carousel"; imageUrls: string[]; caption: string | null; locationId?: string | null }
  | { kind: "story"; imageUrl?: string | null; videoUrl?: string | null }
  | { kind: "reel"; videoUrl: string; caption: string | null; coverUrl?: string | null; locationId?: string | null };

async function waitFinished(id: string, token: string, tries: number, wait: number) {
  for (let i = 0; i < tries; i++) {
    const s = await graph("GET", id, { fields: "status_code,status" }, token);
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new MetaError(`IG container ${s.status_code}: ${s.status ?? ""}`, false);
    if (i === tries - 1) throw new MetaError(`IG container still processing after ${Math.round((tries * wait) / 60000)} min`, true);
    await sleep(wait);
  }
}

/** Creates a media container; if Instagram rejects the location tag the post still goes out (without it). */
async function createContainer(igId: string, params: Record<string, string>, token: string): Promise<{ id: string }> {
  try {
    return await graph("POST", `${igId}/media`, params, token);
  } catch (e) {
    if (params.location_id && /location/i.test((e as Error).message)) {
      log(`location tag ${params.location_id} rejected (${(e as Error).message.slice(0, 120)}) → publishing without it`);
      const { location_id: _drop, ...rest } = params;
      return await graph("POST", `${igId}/media`, rest, token);
    }
    throw e;
  }
}

export async function publishInstagram(media: IgMedia): Promise<{ id: string; permalink: string | null }> {
  const igId = need("META_IG_USER_ID");
  const token = need("META_ACCESS_TOKEN");
  const params: Record<string, string> = {};
  let containerId: string;
  let video = false;
  if (media.kind === "carousel") {
    // child containers (one per slide) → carousel container → publish
    const children: string[] = [];
    for (const [i, url] of media.imageUrls.entries()) {
      const child = await graph("POST", `${igId}/media`, { image_url: url, is_carousel_item: "true" }, token);
      await waitFinished(child.id, token, 24, 5000);
      children.push(child.id);
      log(`IG carousel slide ${i + 1}/${media.imageUrls.length}`, child.id);
    }
    params.media_type = "CAROUSEL";
    params.children = children.join(",");
    if (media.caption) params.caption = media.caption;
    if (media.locationId) params.location_id = media.locationId;
    containerId = (await createContainer(igId, params, token)).id;
  } else {
    if (media.kind === "reel") {
      video = true;
      params.media_type = "REELS";
      params.video_url = media.videoUrl;
      params.share_to_feed = "true";
      if (media.caption) params.caption = media.caption;
      if (media.coverUrl) params.cover_url = media.coverUrl;
      if (media.locationId) params.location_id = media.locationId;
    } else if (media.kind === "story") {
      params.media_type = "STORIES";
      video = !!media.videoUrl;
      if (media.videoUrl) params.video_url = media.videoUrl;
      else params.image_url = media.imageUrl!;
    } else {
      params.image_url = media.imageUrl;
      if (media.caption) params.caption = media.caption;
      if (media.locationId) params.location_id = media.locationId;
    }
    containerId = (await createContainer(igId, params, token)).id;
  }
  log("IG container", containerId);
  // images ~2 min, videos up to ~10 min
  await waitFinished(containerId, token, video ? 60 : 24, video ? 10000 : 5000);
  const pub = await graph("POST", `${igId}/media_publish`, { creation_id: containerId }, token);
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

/** Creates a REELS container for the video and waits for FINISHED — nothing is published. Validates the file against Meta's rules. */
export async function checkReelContainer(videoUrl: string, coverUrl: string | null, story = false): Promise<string> {
  const igId = need("META_IG_USER_ID");
  const token = need("META_ACCESS_TOKEN");
  const params: Record<string, string> = story
    ? { media_type: "STORIES", video_url: videoUrl }
    : { media_type: "REELS", video_url: videoUrl, share_to_feed: "true", caption: "container check (not published)" };
  if (coverUrl && !story) params.cover_url = coverUrl;
  const container = await graph("POST", `${igId}/media`, params, token);
  for (let i = 0; i < 60; i++) {
    const s = await graph("GET", container.id, { fields: "status_code,status" }, token);
    log(`container ${container.id}: ${s.status_code} ${s.status ?? ""}`);
    if (s.status_code === "FINISHED") return container.id;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new MetaError(`IG container ${s.status_code}: ${s.status ?? ""}`, false);
    await sleep(10000);
  }
  throw new MetaError("container still processing after 10 min", true);
}

/** Creates the child containers and the carousel container (never publishes) — validates slides and caption against Instagram. */
export async function checkCarouselContainer(slides: string[], caption: string | null, locationId?: string | null): Promise<string> {
  const igId = need("META_IG_USER_ID");
  const token = need("META_ACCESS_TOKEN");
  const children: string[] = [];
  for (const url of slides) {
    const child = await graph("POST", `${igId}/media`, { image_url: url, is_carousel_item: "true" }, token);
    await waitFinished(child.id, token, 24, 5000);
    children.push(child.id);
  }
  const params: Record<string, string> = { media_type: "CAROUSEL", children: children.join(","), caption: caption ?? "container check (not published)" };
  if (locationId) params.location_id = locationId;
  const parent = await createContainer(igId, params, token);
  await waitFinished(parent.id, token, 24, 5000);
  return parent.id;
}
