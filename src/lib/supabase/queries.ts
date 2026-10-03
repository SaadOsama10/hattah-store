import { getPublicSupabaseClient } from "@/lib/supabase/public";
import { buildCategoryTree, getDescendantKeys } from "@/lib/categories";
import { isProductOnSale } from "@/lib/supabase/types";
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

/** Every product currently on sale, across all categories — narrowed in
 * SQL to rows that even have a sale_price set, then filtered in JS with
 * isProductOnSale to drop any stale row where sale_price >= price. */
export async function getOnSaleProducts(): Promise<ProductRow[]> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("has_quantities", false)
    .not("sale_price", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ProductRow[]).filter((p) =>
    isProductOnSale(p.price, p.sale_price)
  );
}

/** Cheap existence check for the nav link / homepage banner — only reads
 * the two columns it needs, not full product rows. Purely decorative
 * gating (hide a link, hide a banner), so a transient Supabase error is
 * swallowed and defaults to "no offers" rather than breaking the page. */
export async function hasActiveOffers(): Promise<boolean> {
  try {
    const supabase = getPublicSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("price, sale_price")
      .eq("has_quantities", false)
      .not("sale_price", "is", null);
    if (error) throw new Error(error.message);
    return (data ?? []).some((p) => isProductOnSale(p.price, p.sale_price));
  } catch (err) {
    console.error("hasActiveOffers failed, defaulting to false:", err);
    return false;
  }
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

/** Purely decorative supporting data for the homepage tiles (product
 * counts) — never worth crashing the whole page over, so a transient
 * Supabase error here is swallowed and the tiles just render without
 * counts rather than taking the homepage down with them. */
export async function getProductCountsByCategory(): Promise<Record<string, number>> {
  try {
    const supabase = getPublicSupabaseClient();
    const { data, error } = await supabase.from("products").select("category");
    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.category] = (counts[row.category] ?? 0) + 1;
    }
    return counts;
  } catch (err) {
    console.error("getProductCountsByCategory failed, continuing without counts:", err);
    return {};
  }
}

/** Picks one random "cover" image per top-level category, drawn from the
 * first photo of every product filed under it (including its
 * subcategories) — no manual per-category image is ever stored, so the
 * homepage tile automatically reflects whatever products actually exist
 * and picks a different one on every page load. Categories with no
 * product photos yet are simply absent from the result.
 *
 * Purely decorative: a category tile without a cover image just falls
 * back to its plain icon/gradient design (already a supported state), so
 * a transient Supabase error here is swallowed rather than crashing the
 * whole homepage over a background photo. */
export async function getCategoryCoverImages(
  categories: CategoryRow[]
): Promise<Record<CategoryKey, string>> {
  try {
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
  } catch (err) {
    console.error("getCategoryCoverImages failed, continuing without cover photos:", err);
    return {};
  }
}
