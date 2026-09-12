export interface CartItem {
  // Uniquely identifies this cart *line* — the same product with a
  // different size/color is a different line, not a merged quantity.
  lineId: string;
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  size?: string;
  color?: string;
}

/** The same product + the same size/color selection (or lack thereof)
 * always resolves to the same lineId, so re-adding it merges quantity
 * instead of creating a duplicate row. */
export function buildCartLineId(id: string, size?: string, color?: string): string {
  return [id, size ?? "", color ?? ""].join("::");
}

const CART_STORAGE_KEY = "hattah-cart";

export function readCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCartToStorage(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage can fail (private browsing, quota) — the cart just won't
    // persist across reloads, which is an acceptable degradation.
  }
}
