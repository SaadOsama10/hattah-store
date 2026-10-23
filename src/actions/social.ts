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
  fields: { caption_full?: string | null; scheduled_at?: string }
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

export async function saveSocialSettings(s: Omit<SocialSettingsRow, "id">) {
  await assertAdminSession();
  const slots = s.daily_slots.filter(
    (x) => (x.type === "feed" || x.type === "story") && /^([01]\d|2[0-3]):[0-5]\d$/.test(x.time)
  );
  const supabase = getServiceSupabaseClient();
  const { error } = await supabase
    .from("social_settings")
    .update({
      enabled: s.enabled,
      auto_approve: s.auto_approve,
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
