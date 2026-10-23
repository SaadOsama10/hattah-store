import type { ProductRecord } from "./types.js";

export function sortedImages(p: { product_images?: { image_url: string; sort_order: number }[] }): string[] {
  return [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.image_url);
}

/** Mirrors the storefront's pricing rule: quantity products show their
 * cheapest option; a sale_price only counts when it is below price. */
export function effectivePrice(p: {
  price: number;
  sale_price?: number | null;
  product_quantities?: { price: number }[];
}): { current: number; old: number | null } {
  const q = p.product_quantities ?? [];
  if (q.length) return { current: Math.min(...q.map((x) => Number(x.price))), old: null };
  const price = Number(p.price);
  const sale = p.sale_price == null ? null : Number(p.sale_price);
  if (sale != null && sale > 0 && sale < price) return { current: sale, old: price };
  return { current: price, old: null };
}

export function categoryLabelAr(map: Map<string, string>, key: string): string {
  return map.get(key) ?? "";
}

export type { ProductRecord };
