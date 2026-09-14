"use server";

import { revalidatePath } from "next/cache";
import { assertAdminSession } from "@/lib/admin-auth";
import { getServiceSupabaseClient } from "@/lib/supabase/service";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface CategoryFields {
  label_ar: string;
  label_en: string;
  label_tr: string;
  description_ar: string | null;
  description_en: string | null;
  description_tr: string | null;
  icon_key: string;
}

const DESCRIPTION_MAX_LENGTH = 60;

function readDescription(formData: FormData, field: string): string | null {
  const raw = String(formData.get(field) ?? "").trim().slice(0, DESCRIPTION_MAX_LENGTH);
  return raw || null;
}

/** Subcategories never render a homepage tile, so they never get a
 * description or icon — regardless of what the form submits, those
 * columns are always forced to their "unset" value for them. */
function readFields(formData: FormData, isSubcategory: boolean): CategoryFields {
  return {
    label_ar: String(formData.get("label_ar") ?? "").trim(),
    label_en: String(formData.get("label_en") ?? "").trim(),
    label_tr: String(formData.get("label_tr") ?? "").trim(),
    description_ar: isSubcategory ? null : readDescription(formData, "description_ar"),
    description_en: isSubcategory ? null : readDescription(formData, "description_en"),
    description_tr: isSubcategory ? null : readDescription(formData, "description_tr"),
    icon_key: isSubcategory ? "gift" : String(formData.get("icon_key") ?? "").trim() || "gift",
  };
}

function readParentKey(formData: FormData): string | null {
  const raw = String(formData.get("parent_key") ?? "").trim();
  return raw || null;
}

/** Throws if `parentKey` can't be used as a parent — either it doesn't
 * exist, or it's itself a subcategory (only two levels are allowed). */
async function assertValidParent(
  supabase: ReturnType<typeof getServiceSupabaseClient>,
  parentKey: string
) {
  const { data: parent, error } = await supabase
    .from("categories")
    .select("key, parent_key")
    .eq("key", parentKey)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!parent) throw new Error("Selected parent category does not exist");
  if (parent.parent_key) {
    throw new Error("A subcategory cannot itself contain subcategories");
  }
}

export async function createCategory(formData: FormData) {
  await assertAdminSession();

  const parentKey = readParentKey(formData);
  const fields = readFields(formData, parentKey !== null);
  if (!fields.label_ar || !fields.label_en || !fields.label_tr) {
    throw new Error("Missing required fields");
  }

  const supabase = getServiceSupabaseClient();

  if (parentKey) {
    await assertValidParent(supabase, parentKey);
  }

  const baseKey = slugify(fields.label_en) || slugify(fields.label_ar) || "category";
  let key = baseKey;
  let suffix = 2;
  // Ensure the generated key is unique — append -2, -3, … on collision.
  while (true) {
    const { data: existing } = await supabase
      .from("categories")
      .select("key")
      .eq("key", key)
      .maybeSingle();
    if (!existing) break;
    key = `${baseKey}-${suffix}`;
    suffix += 1;
  }

  const { data: maxRow } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSortOrder = maxRow && maxRow.length > 0 ? maxRow[0].sort_order + 1 : 1;

  const { error } = await supabase
    .from("categories")
    .insert({ key, ...fields, sort_order: nextSortOrder, parent_key: parentKey });

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  return { key };
}

export async function updateCategory(key: string, formData: FormData) {
  await assertAdminSession();

  const parentKey = readParentKey(formData);
  if (parentKey === key) {
    throw new Error("A category cannot be its own parent");
  }

  const fields = readFields(formData, parentKey !== null);
  if (!fields.label_ar || !fields.label_en || !fields.label_tr) {
    throw new Error("Missing required fields");
  }

  const supabase = getServiceSupabaseClient();

  if (parentKey) {
    await assertValidParent(supabase, parentKey);

    // This category is about to become a subcategory — it must not have
    // subcategories of its own, or we'd end up three levels deep.
    const { count: childCount, error: childError } = await supabase
      .from("categories")
      .select("key", { count: "exact", head: true })
      .eq("parent_key", key);
    if (childError) throw new Error(childError.message);
    if (childCount && childCount > 0) {
      throw new Error(
        "This category has subcategories and cannot become a subcategory itself"
      );
    }
  }

  const { error } = await supabase
    .from("categories")
    .update({ ...fields, parent_key: parentKey })
    .eq("key", key);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function deleteCategory(key: string): Promise<{
  success: boolean;
  productCount: number;
  subcategoryCount: number;
}> {
  await assertAdminSession();

  const supabase = getServiceSupabaseClient();

  const { data: children, error: childrenError } = await supabase
    .from("categories")
    .select("key")
    .eq("parent_key", key);
  if (childrenError) throw new Error(childrenError.message);

  const childKeys = (children ?? []).map((c) => c.key);
  const subcategoryCount = childKeys.length;

  // A parent's product count includes products filed directly under it AND
  // products filed under any of its subcategories — deleting it must not
  // orphan either.
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .in("category", [key, ...childKeys]);

  if (countError) throw new Error(countError.message);
  const productCount = count ?? 0;

  if (productCount > 0 || subcategoryCount > 0) {
    return { success: false, productCount, subcategoryCount };
  }

  const { error } = await supabase.from("categories").delete().eq("key", key);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  return { success: true, productCount: 0, subcategoryCount: 0 };
}
