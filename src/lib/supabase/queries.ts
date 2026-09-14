import { getPublicSupabaseClient } from "@/lib/supabase/public";
import { buildCategoryTree, getDescendantKeys } from "@/lib/categories";
import type { CategoryKey, CategoryRow, ProductRow } from "@/lib/supabase/types";

const PRODUCT_SELECT =
  "*, product_images(id, product_id, image_url, sort_order), product_sizes(id, product_id, label, sort_order), product_colors(id, product_id, label_ar, label_en, label_tr, sort_order), product_quantities(id, product_id, label_ar, label_en, label_tr, price, sort_order)";

export async function getAllProducts(): Promise<ProductRow[]> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProductRow[];
}

export async function getFeaturedProducts(limit = 12): Promise<ProductRow[]> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProductRow[];
}

export async function getProductById(id: string): Promise<ProductRow | null> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as unknown as ProductRow) ?? null;
}

export async function getRelatedProducts(
  category: string,
  excludeId: string,
  limit = 4
): Promise<ProductRow[]> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("category", category)
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProductRow[];
}

export async function getCategories(): Promise<CategoryRow[]> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CategoryRow[];
}

export async function getProductCountsByCategory(): Promise<Record<string, number>> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase.from("products").select("category");

  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.category] = (counts[row.category] ?? 0) + 1;
  }
  return counts;
}

/** Picks one random "cover" image per top-level category, drawn from the
 * first photo of every product filed under it (including its
 * subcategories) — no manual per-category image is ever stored, so the
 * homepage tile automatically reflects whatever products actually exist
 * and picks a different one on every page load. Categories with no
 * product photos yet are simply absent from the result. */
export async function getCategoryCoverImages(
  categories: CategoryRow[]
): Promise<Record<CategoryKey, string>> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select("category, product_images(image_url, sort_order)");

  if (error) throw new Error(error.message);

  const imagesByCategory: Record<string, string[]> = {};
  for (const row of (data ?? []) as {
    category: string;
    product_images: { image_url: string; sort_order: number }[];
  }[]) {
    const cover = [...(row.product_images ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order
    )[0]?.image_url;
    if (!cover) continue;
    (imagesByCategory[row.category] ??= []).push(cover);
  }

  const result: Record<CategoryKey, string> = {};
  for (const top of buildCategoryTree(categories)) {
    const pool = getDescendantKeys(categories, top.key).flatMap(
      (key) => imagesByCategory[key] ?? []
    );
    if (pool.length > 0) {
      result[top.key] = pool[Math.floor(Math.random() * pool.length)];
    }
  }
  return result;
}
