"use server";

import { revalidatePath } from "next/cache";
import { assertAdminSession } from "@/lib/admin-auth";
import { getServiceSupabaseClient } from "@/lib/supabase/service";
import { dispatchWorkflow, startManualBuild } from "@/lib/github-dispatch";
import { MANUAL_MAX_IMAGES } from "@/lib/social-manual-shared";
import type { ManualParams, SocialPostWithProduct } from "@/lib/social-types";

type PostType = "feed" | "story" | "reel" | "carousel";
type Angle = "showcase" | "heritage" | "quote" | "offer";


export interface ManualProduct {
  id: string;
  name_ar: string;
  name_en: string;
  name_tr: string;
  images: string[];
  price: number;
  excluded: boolean;
}

export interface ManualWarning {
  kind: "near" | "product" | "music" | "disabled";
  text: string;
}

const TZ = "Europe/Istanbul";
const hm = (iso: string) =>
  new Intl.DateTimeFormat("ar", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", numberingSystem: "latn" }).format(new Date(iso));
const KIND: Record<string, string> = { feed: "منشور", story: "ستوري", reel: "ريل", carousel: "كاروسيل" };

/** Every product (also the ones excluded from the automation) with all its photos. */
export async function listManualProducts(): Promise<ManualProduct[]> {
  await assertAdminSession();
  const sb = getServiceSupabaseClient();
  const [{ data, error }, { data: settings }] = await Promise.all([
    sb.from("products").select("id, name_ar, name_en, name_tr, price, product_images(image_url, sort_order)").order("name_ar"),
    sb.from("social_settings").select("excluded_product_ids").eq("id", 1).single(),
  ]);
  if (error) throw new Error(error.message);
  const excluded = new Set((settings?.excluded_product_ids as string[] | null) ?? []);
  return (data ?? []).map((p) => ({
    id: p.id as string,
    name_ar: p.name_ar as string,
    name_en: (p.name_en as string) ?? "",
    name_tr: (p.name_tr as string) ?? "",
    price: Number(p.price),
    excluded: excluded.has(p.id as string),
    images: [...((p.product_images as { image_url: string; sort_order: number }[]) ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => i.image_url),
  }));
}

export async function getManualPost(id: string): Promise<SocialPostWithProduct | null> {
  await assertAdminSession();
  const sb = getServiceSupabaseClient();
  const { data } = await sb.from("social_posts").select("*, products(name_ar)").eq("id", id).eq("is_manual", true).maybeSingle();
  return (data as unknown as SocialPostWithProduct | null) ?? null;
}

export interface ManualInput {
  id?: string;
  productId: string;
  postType: PostType;
  angle: Angle;
  images: string[];
  /** UTC ISO; ignored when publishNow. */
  scheduledAt: string | null;
  publishNow: boolean;
  textMode: "ai" | "manual";
  headline: string;
  subline: string;
  caption: string;
  music: string | null;
  /** AI text on an existing post: write new text ("full") or keep the stored one ("render"). */
  op: "full" | "render";
}

/** Creates (or updates) the manual post row and starts the build. Returns the row id. */
export async function saveManualPost(input: ManualInput): Promise<{ id: string; startError?: string }> {
  await assertAdminSession();
  const sb = getServiceSupabaseClient();

  if (!["feed", "story", "reel", "carousel"].includes(input.postType)) throw new Error("نوع غير صالح");
  if (!["showcase", "heritage", "quote", "offer"].includes(input.angle)) throw new Error("زاوية غير صالحة");

  const { data: prod } = await sb.from("products").select("id, product_images(image_url)").eq("id", input.productId).maybeSingle();
  if (!prod) throw new Error("المنتج غير موجود");
  const own = new Set(((prod.product_images as { image_url: string }[]) ?? []).map((i) => i.image_url));
  const images = [...new Set(input.images)].filter((u) => own.has(u)).slice(0, MANUAL_MAX_IMAGES[input.postType]);
  if (!images.length) throw new Error("اختر صورة واحدة على الأقل");

  let scheduled: Date;
  if (input.publishNow) scheduled = new Date();
  else {
    scheduled = new Date(input.scheduledAt ?? "");
    if (Number.isNaN(scheduled.getTime())) throw new Error("موعد غير صالح");
    if (scheduled.getTime() < Date.now() - 60_000) throw new Error("الموعد في الماضي — اختر موعدًا قادمًا أو «انشر الآن»");
  }

  const headline = input.headline.trim();
  const subline = input.subline.trim();
  const caption = input.caption.trim();
  if (input.textMode === "manual") {
    if (!headline || !subline) throw new Error("العنوان والسطر الفرعي مطلوبان");
    if (headline.length > 60 || subline.length > 140) throw new Error("نص التصميم طويل جدًا");
    if (input.postType !== "story" && !caption) throw new Error("الكابشن مطلوب");
    if (caption.length > 2200) throw new Error("الكابشن أطول من 2200 حرف");
  }

  const params: ManualParams = {
    images,
    text_mode: input.textMode,
    music: input.postType === "reel" || input.postType === "story" ? input.music || null : null,
    op: input.textMode === "ai" ? input.op : "render",
    publish_now: input.publishNow,
  };
  const patch: Record<string, unknown> = {
    product_id: input.productId,
    post_type: input.postType,
    angle: input.angle,
    scheduled_at: scheduled.toISOString(),
    manual_params: params,
    render_state: "queued",
    render_error: null,
    render_updated_at: new Date().toISOString(),
    error: null,
  };
  if (input.textMode === "manual") {
    patch.design = { headline, subline };
    patch.caption_full = input.postType === "story" ? null : caption;
  } else if (params.op === "full") {
    patch.design = null;
    patch.caption_full = null;
  }

  let id = input.id;
  if (id) {
    const { data, error } = await sb.from("social_posts").update(patch).eq("id", id).eq("is_manual", true).eq("status", "composing").select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("لا يمكن تعديل هذا المنشور (تم اعتماده أو حذفه)");
  } else {
    const { data, error } = await sb
      .from("social_posts")
      .insert({ ...patch, is_manual: true, status: "composing", slot_key: null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = data.id as string;
  }
  return { id, ...(await start(id)) };
}

async function start(id: string): Promise<{ startError?: string }> {
  try {
    await startManualBuild(id);
    return {};
  } catch (e) {
    const msg = (e as Error).message;
    await getServiceSupabaseClient().from("social_posts").update({ render_state: "failed", render_error: `تعذّر إطلاق المهمة: ${msg}`.slice(0, 500), render_updated_at: new Date().toISOString() }).eq("id", id);
    return { startError: msg };
  }
}

/** Re-runs the build of a composing post: new text (model) + render, or render only. */
export async function rebuildManualPost(id: string, op: "full" | "render"): Promise<{ startError?: string }> {
  await assertAdminSession();
  const sb = getServiceSupabaseClient();
  const { data: row } = await sb.from("social_posts").select("manual_params, status, render_state, render_updated_at").eq("id", id).eq("is_manual", true).maybeSingle();
  if (!row || row.status !== "composing") throw new Error("لا يمكن إعادة البناء");
  const params = (row.manual_params ?? {}) as ManualParams;
  const stale = row.render_updated_at && Date.now() - new Date(row.render_updated_at as string).getTime() > 15 * 60_000;
  if ((row.render_state === "queued" || row.render_state === "running") && !stale) throw new Error("المعالجة جارية الآن");
  // Owner-written text can only be re-rendered; "full" means the model writes new text.
  const next: ManualParams = { ...params, text_mode: op === "full" ? "ai" : params.text_mode, op };
  const patch: Record<string, unknown> = { manual_params: next, render_state: "queued", render_error: null, render_updated_at: new Date().toISOString() };
  if (op === "full") Object.assign(patch, { design: null, caption_full: null });
  const { error } = await sb.from("social_posts").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  return start(id);
}

export async function saveManualCaption(id: string, caption: string) {
  await assertAdminSession();
  const text = caption.trim();
  if (!text) throw new Error("الكابشن فارغ");
  if (text.length > 2200) throw new Error("الكابشن أطول من 2200 حرف");
  const sb = getServiceSupabaseClient();
  const { error } = await sb.from("social_posts").update({ caption_full: text }).eq("id", id).eq("is_manual", true).eq("status", "composing");
  if (error) throw new Error(error.message);
}

/** Drops an unfinished manual draft (and its files are cleaned up by cleanup.ts). */
export async function discardManualPost(id: string) {
  await assertAdminSession();
  const sb = getServiceSupabaseClient();
  const { data: row } = await sb.from("social_posts").select("image_url, video_url, slides").eq("id", id).eq("is_manual", true).eq("status", "composing").maybeSingle();
  const { error } = await sb.from("social_posts").delete().eq("id", id).eq("is_manual", true).eq("status", "composing");
  if (error) throw new Error(error.message);
  const marker = "/social-posts/";
  const paths = [row?.image_url, row?.video_url, ...((row?.slides as string[] | null) ?? [])]
    .filter((u): u is string => !!u && u.includes(marker))
    .map((u) => decodeURIComponent(u.split(marker)[1].split("?")[0]));
  if (paths.length) await sb.storage.from("social-posts").remove(paths);
  revalidatePath("/[locale]/admin/social", "page");
}

/** Soft warnings (never blocking): neighbours within 20 min, product posted within 3 days, music repeat, system off. */
export async function checkManualWarnings(q: {
  excludeId?: string;
  productId: string;
  postType: PostType;
  scheduledAt: string | null; // null = now
  music: string | null;
}): Promise<ManualWarning[]> {
  await assertAdminSession();
  const sb = getServiceSupabaseClient();
  const at = q.scheduledAt ? new Date(q.scheduledAt) : new Date();
  if (Number.isNaN(at.getTime())) return [];
  const out: ManualWarning[] = [];
  const day3 = 3 * 86400e3;

  // 1) another item within 20 minutes
  let nearQ = sb.from("social_posts").select("id, post_type, scheduled_at, status, products(name_ar)")
    .in("status", ["draft", "approved", "publishing", "published"])
    .gte("scheduled_at", new Date(at.getTime() - 20 * 60_000).toISOString())
    .lte("scheduled_at", new Date(at.getTime() + 20 * 60_000).toISOString())
    .order("scheduled_at");
  if (q.excludeId) nearQ = nearQ.neq("id", q.excludeId);
  for (const r of (await nearQ).data ?? []) {
    const mins = Math.round(Math.abs(new Date(r.scheduled_at as string).getTime() - at.getTime()) / 60_000);
    const name = (r.products as unknown as { name_ar: string } | null)?.name_ar ?? "";
    out.push({ kind: "near", text: `قريب من ${KIND[r.post_type as string]} «${name.slice(0, 30)}» (${hm(r.scheduled_at as string)}) — الفرق ${mins} دقيقة` });
  }

  // 2) the same product within 3 days (before or after)
  let prodQ = sb.from("social_posts").select("id, post_type, scheduled_at, status")
    .eq("product_id", q.productId)
    .not("status", "in", "(skipped,composing,failed)")
    .gte("scheduled_at", new Date(at.getTime() - day3).toISOString())
    .lte("scheduled_at", new Date(at.getTime() + day3).toISOString())
    .order("scheduled_at", { ascending: false });
  if (q.excludeId) prodQ = prodQ.neq("id", q.excludeId);
  for (const r of ((await prodQ).data ?? []).slice(0, 4)) {
    const past = new Date(r.scheduled_at as string).getTime() <= at.getTime();
    out.push({ kind: "product", text: `هذا المنتج ${past ? "نُشر/جُدول" : "مجدول بعدها"} خلال 3 أيام: ${KIND[r.post_type as string]} ${hm(r.scheduled_at as string)}` });
  }

  // 3) the chosen music track already used by a reel within ±3 days
  if (q.music && (q.postType === "reel" || q.postType === "story")) {
    let musQ = sb.from("social_posts").select("id, scheduled_at")
      .eq("music_track", q.music)
      .eq("post_type", "reel")
      .not("status", "in", "(skipped,composing)")
      .gte("scheduled_at", new Date(at.getTime() - day3).toISOString())
      .lte("scheduled_at", new Date(at.getTime() + day3).toISOString());
    if (q.excludeId) musQ = musQ.neq("id", q.excludeId);
    const rows = (await musQ).data ?? [];
    if (rows.length) out.push({ kind: "music", text: `المقطع الموسيقي مستخدم في ريل خلال 3 أيام (${hm(rows[0].scheduled_at as string)})` });
  }

  // 4) scheduled posts are only published while the system is on
  if (q.scheduledAt) {
    const { data: s } = await sb.from("social_settings").select("enabled").eq("id", 1).single();
    if (s && !s.enabled) out.push({ kind: "disabled", text: "نظام النشر مطفأ حاليًا (زر الإيقاف) — المنشورات المجدولة لن تُنشر قبل تشغيله" });
  }
  return out;
}

/** Final step: approve a finished manual post. `publishNow` also starts the publish workflow right away. */
export async function approveManualPost(id: string, publishNow: boolean): Promise<{ message: string }> {
  await assertAdminSession();
  const sb = getServiceSupabaseClient();
  const { data: row } = await sb.from("social_posts").select("*").eq("id", id).eq("is_manual", true).maybeSingle();
  if (!row) throw new Error("المنشور غير موجود");
  if (row.status !== "composing") throw new Error("تم اعتماد هذا المنشور من قبل");
  if (row.render_state !== "ready") throw new Error("المعاينة غير جاهزة بعد");
  const type = row.post_type as PostType;
  if (!row.image_url || (type === "reel" && !row.video_url) || (type === "carousel" && !(row.slides as string[] | null)?.length)) throw new Error("الوسائط غير مكتملة — أعد الرسم");
  if (type !== "story" && !(row.caption_full as string | null)?.trim()) throw new Error("الكابشن فارغ");

  const when = publishNow ? new Date() : new Date(row.scheduled_at as string);
  if (!publishNow && when.getTime() < Date.now() + 60_000) throw new Error("موعد النشر مضى — عدّل الموعد أو اختر «اعتماد ونشر الآن»");
  const { data: done, error } = await sb
    .from("social_posts")
    .update({ status: "approved", scheduled_at: when.toISOString(), error: null })
    .eq("id", id)
    .eq("status", "composing")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!done) throw new Error("تم اعتماد هذا المنشور من قبل");
  revalidatePath("/[locale]/admin/social", "page");
  if (!publishNow) return { message: `تم الاعتماد والجدولة — يُنشر ${hm(when.toISOString())} (إسطنبول)` };
  try {
    await dispatchWorkflow("social-publish.yml", { post_id: id });
    return { message: "تم الاعتماد وإطلاق النشر الآن — يظهر على إنستغرام خلال دقائق" };
  } catch (e) {
    return { message: `تم الاعتماد لكن تعذّر إطلاق النشر الفوري (${(e as Error).message}) — سيُنشر تلقائيًا خلال دقائق عبر الجدولة` };
  }
}
