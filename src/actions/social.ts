"use server";

import { revalidatePath } from "next/cache";
import { assertAdminSession } from "@/lib/admin-auth";
import { getServiceSupabaseClient } from "@/lib/supabase/service";
import { dispatchWorkflow } from "@/lib/github-dispatch";
import type {
  SocialPostWithProduct,
  SocialSettingsRow,
} from "@/lib/social-types";

const POST_SELECT = "*, products(name_ar)";

export async function listSocialPosts(
  tab: "upcoming" | "history"
): Promise<SocialPostWithProduct[]> {
  await assertAdminSession();
  const supabase = getServiceSupabaseClient();
  let q = supabase.from("social_posts").select(POST_SELECT);
  if (tab === "upcoming") {
    q = q
      .in("status", ["draft", "approved", "publishing", "failed"])
      .order("scheduled_at", { ascending: true });
  } else {
    q = q
      .in("status", ["published", "skipped"])
      .order("scheduled_at", { ascending: false })
      .limit(100);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SocialPostWithProduct[];
}

export async function getSocialSettings(): Promise<SocialSettingsRow> {
  await assertAdminSession();
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("social_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);
  return data as SocialSettingsRow;
}

export async function listProductOptions(): Promise<{ id: string; name_ar: string }[]> {
  await assertAdminSession();
  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name_ar")
    .order("name_ar");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Direct edits that need no rendering: caption text and schedule. */
export async function updateSocialPost(
  id: string,
  fields: {
    caption_full?: string | null;
    scheduled_at?: string;
    design?: { headline: string; subline: string };
  }
) {
  await assertAdminSession();
  const patch: Record<string, unknown> = {};
  if (fields.caption_full !== undefined) {
    patch.caption_full = fields.caption_full?.trim() || null;
  }
  if (fields.scheduled_at) {
    const d = new Date(fields.scheduled_at);
    if (Number.isNaN(d.getTime())) throw new Error("موعد غير صالح");
    patch.scheduled_at = d.toISOString();
  }
  if (fields.design) {
    const headline = fields.design.headline.trim();
    const subline = fields.design.subline.trim();
    if (!headline || !subline) throw new Error("العنوان والسطر الفرعي مطلوبان");
    if (headline.length > 60 || subline.length > 140) throw new Error("النص طويل جدًا");
    patch.design = { headline, subline };
  }
  const supabase = getServiceSupabaseClient();
  const { error } = await supabase
    .from("social_posts")
    .update(patch)
    .eq("id", id)
    .in("status", ["draft", "approved", "failed"]);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/admin/social", "page");
}

export async function setSocialPostStatus(id: string, status: "approved" | "draft" | "skipped") {
  await assertAdminSession();
  const supabase = getServiceSupabaseClient();
  const { error } = await supabase
    .from("social_posts")
    .update({ status, error: null })
    .eq("id", id)
    .in("status", ["draft", "approved", "failed", "skipped"]);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/admin/social", "page");
}

export async function requestRegenerate(id: string, what: "image" | "caption" | "swap") {
  await assertAdminSession();
  await dispatchWorkflow("social-generate.yml", { mode: "regenerate", post_id: id, what });
}

export async function requestPublishNow(id: string) {
  await assertAdminSession();
  await dispatchWorkflow("social-publish.yml", { post_id: id });
}

export async function requestGenerate(day: "today" | "tomorrow") {
  await assertAdminSession();
  await dispatchWorkflow("social-generate.yml", { mode: day });
}

export async function saveSocialSettings(
  s: Omit<SocialSettingsRow, "id" | "enabled" | "consecutive_failures" | "last_error" | "auto_disabled_at">
) {
  await assertAdminSession();
  const slots = s.daily_slots.filter(
    (x) => (x.type === "feed" || x.type === "story" || x.type === "reel" || x.type === "carousel") && /^([01]\d|2[0-3]):[0-5]\d$/.test(x.time)
  );
  const supabase = getServiceSupabaseClient();
  const { error } = await supabase
    .from("social_settings")
    .update({
      // `enabled` is deliberately NOT saved here — the kill switch owns it.
      auto_approve: s.auto_approve,
      ...(s.store_url !== undefined
        ? { store_url: s.store_url.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "") || "hattah-store.vercel.app" }
        : {}),
      ...(s.publish_to_facebook !== undefined ? { publish_to_facebook: !!s.publish_to_facebook } : {}),
      jitter_minutes: Math.min(30, Math.max(0, Math.round(Number(s.jitter_minutes) || 0))),
      daily_slots: slots,
      caption_languages: s.caption_languages,
      hashtags_base: s.hashtags_base
        .map((h) => h.trim())
        .filter(Boolean)
        .map((h) => (h.startsWith("#") ? h : `#${h}`)),
      excluded_product_ids: s.excluded_product_ids,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/admin/social", "layout");
}

const GRAPH = () => `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v25.0"}`;

/** Verifies the Meta token + IDs by reading the IG account and the Page. */
export async function testMetaConnection(): Promise<
  { ok: true; instagram: string; page: string } | { ok: false; error: string }
> {
  await assertAdminSession();
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.META_IG_USER_ID;
  const pageId = process.env.META_PAGE_ID;
  if (!token || !igId || !pageId) {
    return { ok: false, error: "META_ACCESS_TOKEN / META_IG_USER_ID / META_PAGE_ID غير مضبوطة في Vercel" };
  }
  const get = async (id: string, fields: string) => {
    const r = await fetch(`${GRAPH()}/${id}?fields=${fields}&access_token=${token}`, { cache: "no-store" });
    const j = await r.json();
    if (!r.ok || j.error) throw new Error(j.error?.message ?? r.statusText);
    return j;
  };
  try {
    const ig = await get(igId, "username");
    const page = await get(pageId, "name");
    return { ok: true, instagram: ig.username, page: page.name };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface SocialProductRow {
  id: string;
  name_ar: string;
  image_url: string | null;
  remove_bg: boolean;
}

export async function listSocialProducts(): Promise<SocialProductRow[]> {
  await assertAdminSession();
  const supabase = getServiceSupabaseClient();
  const [{ data: prods, error }, { data: opts }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name_ar, product_images(image_url, sort_order)")
      .order("name_ar"),
    supabase.from("social_product_settings").select("product_id, remove_bg"),
  ]);
  if (error) throw new Error(error.message);
  const flags = new Map((opts ?? []).map((o) => [o.product_id as string, o.remove_bg as boolean]));
  return (prods ?? []).map((p) => {
    const imgs = [...((p.product_images as { image_url: string; sort_order: number }[]) ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order
    );
    return {
      id: p.id as string,
      name_ar: p.name_ar as string,
      image_url: imgs[0]?.image_url ?? null,
      remove_bg: flags.get(p.id as string) ?? false,
    };
  });
}

export async function setProductRemoveBg(productId: string, removeBg: boolean) {
  await assertAdminSession();
  const supabase = getServiceSupabaseClient();
  const { error } = await supabase
    .from("social_product_settings")
    .upsert({ product_id: productId, remove_bg: removeBg, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/admin/social", "page");
}

/** The big kill switch. Turning it back on clears any automatic shut-off warning. */
export async function setSocialEnabled(enabled: boolean) {
  await assertAdminSession();
  const supabase = getServiceSupabaseClient();
  const patch: Record<string, unknown> = { enabled, updated_at: new Date().toISOString() };
  if (enabled) {
    patch.consecutive_failures = 0;
    patch.last_error = null;
    patch.auto_disabled_at = null;
  }
  const { error } = await supabase.from("social_settings").update(patch).eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/[locale]/admin/social", "layout");
}

/** Posts that should already be live (approved, >20 min past their time) but aren't — shown as a yellow warning. */
export async function getLatePosts(): Promise<{ id: string; minutes: number; name: string }[]> {
  await assertAdminSession();
  const supabase = getServiceSupabaseClient();
  const { data: settings } = await supabase.from("social_settings").select("enabled, auto_approve").eq("id", 1).single();
  if (!settings?.enabled) return [];
  const cutoff = new Date(Date.now() - 20 * 60_000).toISOString();
  const floor = new Date(Date.now() - 12 * 3600e3).toISOString();
  const { data } = await supabase
    .from("social_posts")
    .select("id, scheduled_at, products(name_ar)")
    .in("status", settings.auto_approve ? ["approved", "draft"] : ["approved"])
    .lt("scheduled_at", cutoff)
    .gte("scheduled_at", floor)
    .order("scheduled_at");
  return (data ?? []).map((r) => ({
    id: r.id as string,
    minutes: Math.round((Date.now() - new Date(r.scheduled_at as string).getTime()) / 60_000),
    name: ((r.products as unknown as { name_ar: string } | null)?.name_ar ?? "").slice(0, 40),
  }));
}
