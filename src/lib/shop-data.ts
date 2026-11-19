import { buildCategoryTree, getDescendantKeys } from "@/lib/categories";
import { toCardProduct } from "@/lib/storefront";
import { localizeCategory, type CategoryRow, type Locale, type ProductRow } from "@/lib/supabase/types";
import type { ShopCategory, ShopItem, SortKey } from "@/components/shop/ShopClient";

/** Server-side: turns product rows into the small per-card objects the
 * shop listing needs (no descriptions, max two photos, no other languages). */
export function buildShopItems(products: ProductRow[], categories: CategoryRow[], ranking: string[], locale: Locale): ShopItem[] {
  const rank = new Map(ranking.map((id, i) => [id, i]));
  return products.map((row) => ({
    ...toCardProduct(row, locale, categories),
    category: row.category,
    createdAt: row.created_at,
    rank: rank.get(row.id) ?? null,
    search: `${locale === "ar" ? row.name_ar : locale === "tr" ? row.name_tr : row.name_en} ${row.name_en}`.toLowerCase(),
  }));
}

export function buildShopCategories(categories: CategoryRow[], locale: Locale): ShopCategory[] {
  return buildCategoryTree(categories).map((c) => ({
    key: c.key,
    label: localizeCategory(c, locale),
    keys: getDescendantKeys(categories, c.key),
    children: c.children.map((ch) => ({ key: ch.key, label: localizeCategory(ch, locale) })),
  }));
}

export const parseSort = (v: string | undefined): SortKey =>
  v === "best" || v === "price-asc" || v === "price-desc" ? v : "newest";
