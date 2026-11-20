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
export const TILE_IMAGES = 6;

const firstImage = (row: ProductRow) =>
  [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;

/** Photo candidates for a category tile (up to 6): the main photo of the category's
 * products — featured first, then newest, then the ones with more photos.
 * Products without a photo are skipped. */
export function tileImages(inCategory: ProductRow[], n = TILE_IMAGES): string[] {
  const photos = (p: ProductRow) => p.product_images?.length ?? 0;
  const ordered = inCategory
    .filter(firstImage)
    .sort(
      (a, b) =>
        Number(b.is_featured) - Number(a.is_featured) ||
        b.created_at.localeCompare(a.created_at) ||
        photos(b) - photos(a)
    );
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
  /** Admin's "featured" flag (products.is_featured). */
  featured: boolean;
  /** Added to the store within the last NEW_DAYS days (products.created_at). */
  isNew: boolean;
}

/** A product counts as "new" for this many days after it was added. */
export const NEW_DAYS = 21;

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
    featured: row.is_featured === true,
    isNew: Date.now() - new Date(row.created_at).getTime() < NEW_DAYS * 86_400_000,
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
