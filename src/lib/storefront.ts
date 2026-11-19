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
   Storefront settings — change these to restyle the homepage.
   ───────────────────────────────────────────────────────────── */

/** Homepage hero photo: the product (first 8 characters of its id — the
 * same short id at the end of its URL) and which of its photos (0 = first).
 * Change these two values to swap the hero; the alt text, link and price
 * chip follow the product automatically. If the product is deleted the
 * hero falls back to the first featured product. */
export const HERO = { productShortId: "e2bcc176", imageIndex: 2 } as const;

/** Story sections on the homepage: each lists top-level (or sub) category
 * keys; their subcategories are included. A section with no products is
 * simply not shown. */
export const HOME_SECTIONS = {
  food: ["palestinian-food"],
  gifts: ["decor"],
} as const;

export const RAIL_LIMIT = 10;

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
