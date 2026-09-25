"use server";

import { revalidatePath } from "next/cache";
import { assertAdminSession } from "@/lib/admin-auth";
import { getServiceSupabaseClient, PRODUCT_IMAGES_BUCKET } from "@/lib/supabase/service";
import type { CategoryKey } from "@/lib/supabase/types";

export interface ProductFormFields {
  name_ar: string;
  name_en: string;
  name_tr: string;
  description_ar: string;
  description_en: string;
  description_tr: string;
  price: number;
  sale_price: number | null;
  category: CategoryKey;
  is_featured: boolean;
  has_sizes: boolean;
  has_colors: boolean;
  has_quantities: boolean;
}

function readFields(formData: FormData): ProductFormFields {
  const salePriceRaw = String(formData.get("sale_price") ?? "").trim();
  return {
    name_ar: String(formData.get("name_ar") ?? "").trim(),
    name_en: String(formData.get("name_en") ?? "").trim(),
    name_tr: String(formData.get("name_tr") ?? "").trim(),
    description_ar: String(formData.get("description_ar") ?? "").trim(),
    description_en: String(formData.get("description_en") ?? "").trim(),
    description_tr: String(formData.get("description_tr") ?? "").trim(),
    price: Number(formData.get("price") ?? 0),
    sale_price: salePriceRaw ? Number(salePriceRaw) : null,
    category: String(formData.get("category") ?? "") as CategoryKey,
    is_featured: formData.get("is_featured") === "on",
    has_sizes: formData.get("has_sizes") === "on",
    has_colors: formData.get("has_colors") === "on",
    has_quantities: formData.get("has_quantities") === "on",
  };
}

/** A sale_price, when present, must be a real discount — positive and
 * strictly below price — otherwise it wouldn't compute to a valid "on
 * sale" state everywhere it's read (see isProductOnSale). */
function assertValidPrice(fields: Pick<ProductFormFields, "price" | "sale_price">) {
  if (fields.sale_price == null) return;
  if (!Number.isFinite(fields.sale_price) || fields.sale_price <= 0) {
    throw new Error("سعر العرض غير صالح");
  }
  if (fields.sale_price >= fields.price) {
    throw new Error("سعر العرض لازم يكون أقل من السعر الأساسي");
  }
}

function readSizeLabels(formData: FormData): string[] {
  return formData
    .getAll("sizes")
    .map((v) => String(v).trim())
    .filter(Boolean);
}

interface ColorEntry {
  label_ar: string;
  label_en: string;
  label_tr: string;
}

/** Colors are submitted as one JSON blob (each entry has all three
 * language labels together) rather than three parallel form fields,
 * so there's no risk of the ar/en/tr arrays drifting out of index sync. */
function readColorEntries(formData: FormData): ColorEntry[] {
  const raw = formData.get("colors_json");
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((entry) => ({
      label_ar: String((entry as ColorEntry)?.label_ar ?? "").trim(),
      label_en: String((entry as ColorEntry)?.label_en ?? "").trim(),
      label_tr: String((entry as ColorEntry)?.label_tr ?? "").trim(),
    }))
    .filter((entry) => entry.label_ar && entry.label_en && entry.label_tr);
}

interface QuantityEntry {
  label_ar: string;
  label_en: string;
  label_tr: string;
  price: number;
}

/** Same JSON-blob approach as colors, plus a per-entry price — each
 * quantity option (e.g. "250g") is sold at its own price, not the
 * product's base price. */
function readQuantityEntries(formData: FormData): QuantityEntry[] {
  const raw = formData.get("quantities_json");
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((entry) => {
      const e = entry as Partial<QuantityEntry>;
      return {
        label_ar: String(e?.label_ar ?? "").trim(),
        label_en: String(e?.label_en ?? "").trim(),
        label_tr: String(e?.label_tr ?? "").trim(),
        price: Number(e?.price),
      };
    })
    .filter(
      (entry) =>
        entry.label_ar && entry.label_en && entry.label_tr && Number.isFinite(entry.price) && entry.price > 0
    );
}

/** Replaces every size row for a product with the given ordered label
 * list — simplest correct approach since these rows have no other
 * relations to preserve (unlike images, which live in storage too). */
async function replaceSizeVariants(
  supabase: ReturnType<typeof getServiceSupabaseClient>,
  productId: string,
  labels: string[]
) {
  const { error: deleteError } = await supabase
    .from("product_sizes")
    .delete()
    .eq("product_id", productId);
  if (deleteError) throw new Error(deleteError.message);

  if (labels.length > 0) {
    const { error: insertError } = await supabase.from("product_sizes").insert(
      labels.map((label, i) => ({ product_id: productId, label, sort_order: i }))
    );
    if (insertError) throw new Error(insertError.message);
  }
}

/** Same replace-all approach as sizes, but for the three-language color
 * entries. */
async function replaceColorVariants(
  supabase: ReturnType<typeof getServiceSupabaseClient>,
  productId: string,
  colors: ColorEntry[]
) {
  const { error: deleteError } = await supabase
    .from("product_colors")
    .delete()
    .eq("product_id", productId);
  if (deleteError) throw new Error(deleteError.message);

  if (colors.length > 0) {
    const { error: insertError } = await supabase.from("product_colors").insert(
      colors.map((color, i) => ({ product_id: productId, ...color, sort_order: i }))
    );
    if (insertError) throw new Error(insertError.message);
  }
}

/** Same replace-all approach again, for quantity options. */
async function replaceQuantityVariants(
  supabase: ReturnType<typeof getServiceSupabaseClient>,
  productId: string,
  quantities: QuantityEntry[]
) {
  const { error: deleteError } = await supabase
    .from("product_quantities")
    .delete()
    .eq("product_id", productId);
  if (deleteError) throw new Error(deleteError.message);

  if (quantities.length > 0) {
    const { error: insertError } = await supabase.from("product_quantities").insert(
      quantities.map((q, i) => ({ product_id: productId, ...q, sort_order: i }))
    );
    if (insertError) throw new Error(insertError.message);
  }
}

function slugifyFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-60);
}

async function uploadImages(productId: string, files: File[], startOrder: number) {
  const supabase = getServiceSupabaseClient();
  const uploaded: { image_url: string; sort_order: number }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file || file.size === 0) continue;

    const path = `${productId}/${Date.now()}-${i}-${slugifyFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(path);

    uploaded.push({
      image_url: publicUrlData.publicUrl,
      sort_order: startOrder + i,
    });
  }

  return uploaded;
}

export async function createProduct(formData: FormData) {
  await assertAdminSession();

  const fields = readFields(formData);
  const images = formData.getAll("images").filter((f) => f instanceof File) as File[];

  if (!fields.name_ar || !fields.name_en || !fields.name_tr || !fields.category) {
    throw new Error("Missing required fields");
  }
  assertValidPrice(fields);

  const supabase = getServiceSupabaseClient();

  const { data: product, error: insertError } = await supabase
    .from("products")
    .insert(fields)
    .select("id")
    .single();

  if (insertError || !product) {
    throw new Error(insertError?.message ?? "Failed to create product");
  }

  if (images.length > 0) {
    const uploaded = await uploadImages(product.id, images, 0);
    if (uploaded.length > 0) {
      const { error: imagesError } = await supabase
        .from("product_images")
        .insert(uploaded.map((img) => ({ ...img, product_id: product.id })));
      if (imagesError) {
        throw new Error(imagesError.message);
      }
    }
  }

  await replaceSizeVariants(supabase, product.id, fields.has_sizes ? readSizeLabels(formData) : []);
  await replaceColorVariants(
    supabase,
    product.id,
    fields.has_colors ? readColorEntries(formData) : []
  );
  await replaceQuantityVariants(
    supabase,
    product.id,
    fields.has_quantities ? readQuantityEntries(formData) : []
  );

  revalidatePath("/", "layout");
  return { id: product.id as string };
}

export async function updateProduct(
  productId: string,
  formData: FormData,
  removedImageIds: string[]
) {
  await assertAdminSession();

  const fields = readFields(formData);
  const newImages = formData.getAll("images").filter((f) => f instanceof File) as File[];
  assertValidPrice(fields);

  const supabase = getServiceSupabaseClient();

  const { error: updateError } = await supabase
    .from("products")
    .update(fields)
    .eq("id", productId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (removedImageIds.length > 0) {
    const { data: toDelete } = await supabase
      .from("product_images")
      .select("id, image_url")
      .in("id", removedImageIds);

    if (toDelete && toDelete.length > 0) {
      const paths = toDelete
        .map((row) => extractStoragePath(row.image_url))
        .filter((p): p is string => Boolean(p));
      if (paths.length > 0) {
        await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
      }
      await supabase.from("product_images").delete().in("id", removedImageIds);
    }
  }

  if (newImages.length > 0) {
    const { data: existing } = await supabase
      .from("product_images")
      .select("sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const startOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;
    const uploaded = await uploadImages(productId, newImages, startOrder);

    if (uploaded.length > 0) {
      const { error: imagesError } = await supabase
        .from("product_images")
        .insert(uploaded.map((img) => ({ ...img, product_id: productId })));
      if (imagesError) {
        throw new Error(imagesError.message);
      }
    }
  }

  await replaceSizeVariants(supabase, productId, fields.has_sizes ? readSizeLabels(formData) : []);
  await replaceColorVariants(
    supabase,
    productId,
    fields.has_colors ? readColorEntries(formData) : []
  );
  await replaceQuantityVariants(
    supabase,
    productId,
    fields.has_quantities ? readQuantityEntries(formData) : []
  );

  revalidatePath("/", "layout");
  return { id: productId };
}

export async function deleteProduct(productId: string) {
  await assertAdminSession();

  const supabase = getServiceSupabaseClient();

  const { data: images } = await supabase
    .from("product_images")
    .select("image_url")
    .eq("product_id", productId);

  if (images && images.length > 0) {
    const paths = images
      .map((row) => extractStoragePath(row.image_url))
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
    }
  }

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
}

function extractStoragePath(publicUrl: string): string | null {
  const marker = `/object/public/${PRODUCT_IMAGES_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
