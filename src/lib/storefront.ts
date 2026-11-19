import { getDescendantKeys } from "@/lib/categories";
import { absoluteUrl } from "@/lib/site";
import {
  localizeCategory,
  localizeProduct,
  type CategoryRow,
  type Locale,
  type ProductRow,
} from "@/lib/supabase/types";

/* ─────────────────────────────────────────────────────────────
   Homepage selection rules. No product, image or slug is fixed in
   code: everything below is derived from the database on every
   request, so the homepage follows the catalogue by itself.
   ───────────────────────────────────────────────────────────── */

/** Story sections pick their top-level categories by the icon the admin
 * gave the category (/admin/categories), not by a fixed key — rename or
 * re-create a category and the section follows. No match → no section. */
export const HOME_SECTION_ICONS = {
  food: ["utensils", "coffee"],
  gifts: ["lamp", "home", "gift", "flower", "star"],
} as const;

export const RAIL_LIMIT = 10;
export const HERO_SLIDES = 5;
export const TILE_IMAGES = 3;

/** Highest price a buyer can pay for the product: the most expensive
 * option for products with priced options, otherwise the charged price.
 * null for price-on-request / unpriced products. */
export function topPrice(row: ProductRow): number | null {
  if (row.price_on_request) return null;
  const opts = (row.product_quantities ?? []).map((q) => q.price).filter((p) => p > 0);
  const v = opts.length ? Math.max(...opts) : row.sale_price != null && row.sale_price < row.price ? row.sale_price : row.price;
  return v > 0 ? v : null;
}

const firstImage = (row: ProductRow) =>
  [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;

/** Hero slides — the store's premium pieces, from live data:
 *  - priced (price-on-request excluded) and with a main photo;
 *  - "premium" = top price at least half of the most expensive product's
 *    (top price = most expensive option for products with options);
 *  - photo quality signal: products shot with 2+ photos are taken first,
 *    single-photo products only if slots remain;
 *  - most expensive first; ties → featured, then more photos;
 *  - at most 2 per subcategory so the slideshow isn't five similar thobes.
 * Fewer than 3 → topped up with the priciest products that have a photo. */
export function pickHeroProducts(products: ProductRow[], n = HERO_SLIDES): ProductRow[] {
  const photos = (p: ProductRow) => p.product_images?.length ?? 0;
  const priced = products
    .filter((p) => topPrice(p) !== null && firstImage(p))
    .sort(
      (a, b) =>
        topPrice(b)! - topPrice(a)! || Number(b.is_featured) - Number(a.is_featured) || photos(b) - photos(a)
    );
  const max = priced[0] ? topPrice(priced[0])! : 0;
  const premium = priced.filter((p) => topPrice(p)! >= max * 0.5);
  const perCat = new Map<string, number>();
  const picked: ProductRow[] = [];
  for (const pass of [(p: ProductRow) => photos(p) >= 2, () => true]) {
    for (const p of premium) {
      if (picked.length >= n) break;
      if (picked.includes(p) || !pass(p)) continue;
      const c = perCat.get(p.category) ?? 0;
      if (c >= 2) continue;
      perCat.set(p.category, c + 1);
      picked.push(p);
    }
  }
  picked.sort((a, b) => topPrice(b)! - topPrice(a)!);
  if (picked.length >= 3) return picked;
  const extra = products
    .filter((p) => !picked.includes(p) && firstImage(p))
    .sort((a, b) => (topPrice(b) ?? 0) - (topPrice(a) ?? 0));
  return [...picked, ...extra].slice(0, 3);
}

/** Up to `n` photos for a category tile: the main photo of the category's
 * best products (featured, then best sellers, then newest). */
export function tileImages(inCategory: ProductRow[], ranking: string[], n = TILE_IMAGES): string[] {
  const ranked = byRank(inCategory.filter(firstImage), ranking);
  const ordered = [...ranked.filter((p) => p.is_featured), ...ranked.filter((p) => !p.is_featured)];
  return [...new Set(ordered.map((p) => firstImage(p)!))].slice(0, n);
}

/* ───────────────────────────────────────────────────────────── */

/** Everything a product card needs — built on the server so the client
 * receives only these few fields per product. */
export interface CardProduct {
  id: string;
  slug: string;
  name: string;
  image?: string;
  image2?: string;
  imageAlt: string;
  price: number; // the cheapest option for products with priced options
  salePrice: number | null;
  priceOnRequest: boolean;
  /** Priced options whose prices differ → "From X". */
  startingFrom: boolean;
  /** Size/colour/option must be chosen on the product page (no quick add). */
  needsOptions: boolean;
  categoryLabel?: string;
  url: string; // absolute, for the WhatsApp message
}

export function toCardProduct(row: ProductRow, locale: Locale, categories: CategoryRow[]): CardProduct {
  const p = localizeProduct(row, locale);
  const cat = categories.find((c) => c.key === p.category);
  const categoryLabel = cat ? localizeCategory(cat, locale) : undefined;
  const distinctPrices = new Set(p.quantities.map((q) => q.price)).size;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: p.images[0],
    image2: p.images[1],
    imageAlt: categoryLabel ? `${p.name} — ${categoryLabel}` : p.name,
    price: p.startingPrice,
    salePrice: p.salePrice,
    priceOnRequest: p.priceOnRequest,
    startingFrom: p.quantities.length > 1 && distinctPrices > 1,
    needsOptions: p.sizes.length > 0 || p.colors.length > 0 || p.quantities.length > 0,
    categoryLabel,
    url: absoluteUrl(`/${locale}/product/${p.slug}`),
  };
}

/** Products in any of the given categories (and their subcategories). */
export function inCategories(products: ProductRow[], categories: CategoryRow[], keys: readonly string[]): ProductRow[] {
  const allowed = new Set(keys.flatMap((k) => getDescendantKeys(categories, k)));
  return products.filter((p) => allowed.has(p.category));
}

/** Orders products by best-seller rank (unranked keep their order, after). */
export function byRank(products: ProductRow[], ranking: string[]): ProductRow[] {
  const pos = new Map(ranking.map((id, i) => [id, i]));
  return [...products].sort((a, b) => (pos.get(a.id) ?? Infinity) - (pos.get(b.id) ?? Infinity));
}

/** Price used for sorting: the charged price (sale or cheapest option);
 * price-on-request products have none and always sort last. */
export function sortPrice(p: Pick<CardProduct, "price" | "salePrice" | "priceOnRequest">): number | null {
  if (p.priceOnRequest) return null;
  return p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price;
}
