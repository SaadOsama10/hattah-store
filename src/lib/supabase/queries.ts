import { getPublicSupabaseClient } from "@/lib/supabase/public";
import type { CategoryRow, ProductRow } from "@/lib/supabase/types";

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
