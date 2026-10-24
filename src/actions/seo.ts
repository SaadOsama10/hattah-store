"use server";

import { revalidatePath } from "next/cache";
import { assertAdminSession } from "@/lib/admin-auth";
import { getServiceSupabaseClient } from "@/lib/supabase/service";
import { dispatchWorkflow } from "@/lib/github-dispatch";

export interface SeoHealth {
  checked_at: string | null;
  ok: boolean;
  scores: Record<string, Record<string, number>> | null;
  problems: { area: string; message: string }[];
  run_url: string | null;
}

/** Latest weekly check result; null when migration 017 isn't applied or nothing ran yet. */
export async function getSeoHealth(): Promise<SeoHealth | null> {
  await assertAdminSession();
  const { data, error } = await getServiceSupabaseClient().from("seo_health").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return null;
  return data as SeoHealth;
}

export interface DescriptionDraft {
  id: string;
  product_id: string;
  lang: "ar" | "en" | "tr";
  current_text: string;
  suggested_text: string;
  created_at: string;
  products: { name_ar: string; name_en: string } | null;
}

export async function listDescriptionDrafts(): Promise<{ drafts: DescriptionDraft[]; ready: boolean }> {
  await assertAdminSession();
  const { data, error } = await getServiceSupabaseClient()
    .from("product_description_drafts")
    .select("id, product_id, lang, current_text, suggested_text, created_at, products(name_ar, name_en)")
    .eq("status", "draft")
    .order("created_at", { ascending: false });
  if (error) return { drafts: [], ready: false };
  return { drafts: (data ?? []) as unknown as DescriptionDraft[], ready: true };
}

/** Approve (optionally with edited text) → replaces the product's description; reject → discards. */
export async function decideDescriptionDraft(id: string, approve: boolean, editedText?: string) {
  await assertAdminSession();
  const supabase = getServiceSupabaseClient();
  const { data: draft, error } = await supabase
    .from("product_description_drafts")
    .select("id, product_id, lang, suggested_text, status")
    .eq("id", id)
    .single();
  if (error || !draft || draft.status !== "draft") throw new Error("المسودة غير موجودة أو تمت معالجتها");

  if (approve) {
    const text = (editedText ?? draft.suggested_text).trim();
    if (text.length < 50) throw new Error("النص قصير جدًا");
    const { error: upErr } = await supabase
      .from("products")
      .update({ [`description_${draft.lang}`]: text })
      .eq("id", draft.product_id);
    if (upErr) throw new Error(upErr.message);
  }
  await supabase
    .from("product_description_drafts")
    .update({ status: approve ? "approved" : "rejected", decided_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/", "layout");
}

export async function requestDescriptionSuggestions() {
  await assertAdminSession();
  await dispatchWorkflow("seo-descriptions.yml", { min: "250" });
}

export async function requestSeoHealthCheck() {
  await assertAdminSession();
  await dispatchWorkflow("seo-health.yml", {});
}
