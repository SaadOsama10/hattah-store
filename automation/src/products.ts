import type { ProductRecord } from "./types.js";

export function sortedImages(p: { product_images?: { image_url: string; sort_order: number }[] }): string[] {
  return [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.image_url);
}

/** Mirrors the storefront's pricing rule: quantity products show their
 * cheapest option; a sale_price only counts when it is below price. */
export function effectivePrice(p: {
  price: number;
  sale_price?: number | null;
  price_on_request?: boolean;
  product_quantities?: { price: number }[];
}): { current: number; old: number | null; from?: boolean } {
  // Price on request → current = 0 is the "no price" signal for every renderer.
  if (p.price_on_request) return { current: 0, old: null };
  const q = p.product_quantities ?? [];
  if (q.length) {
    const prices = q.map((x) => Number(x.price));
    // More than one differently-priced option → the figure is a "starting from" price.
    return { current: Math.min(...prices), old: null, from: new Set(prices).size > 1 };
  }
  const price = Number(p.price);
  const sale = p.sale_price == null ? null : Number(p.sale_price);
  if (sale != null && sale > 0 && sale < price) return { current: sale, old: price };
  return { current: price, old: null };
}

export function categoryLabelAr(map: Map<string, string>, key: string): string {
  return map.get(key) ?? "";
}

export type { ProductRecord };
