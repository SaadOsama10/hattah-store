export type Locale = "ar" | "en" | "tr";

// Category keys are fully data-driven (managed via the admin panel), so this
// is intentionally a plain string rather than a fixed union.
export type CategoryKey = string;

export interface CategoryRow {
  key: CategoryKey;
  label_ar: string;
  label_en: string;
  label_tr: string;
  sort_order: number;
  // NULL for a top-level category, otherwise the key of its parent.
  // Subcategories are never themselves parents (two levels only).
  parent_key: CategoryKey | null;
  // Admin-editable homepage tile copy — NULL until set, per language.
  description_ar: string | null;
  description_en: string | null;
  description_tr: string | null;
  // Key into the fixed icon set in src/lib/categoryIcons.ts.
  icon_key: string;
}

export type InventoryStatus = "in_stock" | "sold_out" | "partially_sold";

// One purchase occasion (an invoice, a supplier visit) grouping many
// inventory_log line items. total cost and remaining debt are always
// derived from its line items + amount_paid, never stored.
export interface InventoryBatchRow {
  id: string;
  title: string;
  batch_date: string; // date, "YYYY-MM-DD"
  amount_paid: number;
  notes: string | null;
  created_at: string;
}

// Internal admin-only bookkeeping ledger — never read by the storefront,
// never localized (admin-facing, Arabic-only UI). Deliberately independent
// of ProductRow: a free-text description, not a product reference.
export interface InventoryEntryRow {
  id: string;
  batch_id: string;
  entry_date: string; // date, "YYYY-MM-DD"
  item_description: string;
  quantity: number;
  unit_cost: number;
  // Reference-only original-currency price, for batches bought in a
  // foreign currency (e.g. Egyptian pounds). unit_cost above (in TL) is
  // always the value every calculation in this app actually uses — these
  // two are never read by any total/profit/debt computation, just shown
  // alongside unit_cost for the admin's own record. Both null together,
  // or both set together.
  original_currency: string | null;
  original_unit_cost: number | null;
  status: InventoryStatus;
  quantity_sold: number;
  unit_sale_price: number | null;
  last_sale_date: string | null; // date, "YYYY-MM-DD"
  notes: string | null;
  created_at: string;
}

export interface InventoryBatchWithEntries extends InventoryBatchRow {
  inventory_log: InventoryEntryRow[];
}

export interface ProductImageRow {
  id: string;
  product_id: string;
  image_url: string;
  sort_order: number;
}

export interface ProductSizeRow {
  id: string;
  product_id: string;
  // Sizes (S/M/L/XL, "free size", ...) read the same in every language,
  // so a single plain label is enough — unlike colors, below.
  label: string;
  sort_order: number;
}

export interface ProductColorRow {
  id: string;
  product_id: string;
  label_ar: string;
  label_en: string;
  label_tr: string;
  sort_order: number;
}

export interface ProductQuantityRow {
  id: string;
  product_id: string;
  label_ar: string;
  label_en: string;
  label_tr: string;
  // Unlike sizes/colors, each quantity option is priced independently —
  // this is what the buyer actually pays once they pick it.
  price: number;
  sort_order: number;
}

export interface ProductRow {
  id: string;
  name_ar: string;
  name_en: string;
  name_tr: string;
  description_ar: string;
  description_en: string;
  description_tr: string;
  price: number;
  category: CategoryKey;
  is_featured: boolean;
  has_sizes: boolean;
  has_colors: boolean;
  has_quantities: boolean;
  created_at: string;
  product_images: ProductImageRow[];
  product_sizes: ProductSizeRow[];
  product_colors: ProductColorRow[];
  product_quantities: ProductQuantityRow[];
}

export interface LocalizedQuantityOption {
  label: string;
  price: number;
}

export interface LocalizedProduct {
  id: string;
  name: string;
  description: string;
  // Base/fallback price — what's shown on shop cards, and what applies
  // directly when the product has no quantity options.
  price: number;
  category: CategoryKey;
  createdAt: string;
  images: string[];
  // Sizes are plain admin-entered labels (not localized). Colors and
  // quantity labels are resolved to the current site language below,
  // same as name/description.
  sizes: string[];
  colors: string[];
  quantities: LocalizedQuantityOption[];
}

export function localizeProduct(
  row: ProductRow,
  locale: Locale
): LocalizedProduct {
  const name =
    locale === "ar" ? row.name_ar : locale === "tr" ? row.name_tr : row.name_en;
  const description =
    locale === "ar"
      ? row.description_ar
      : locale === "tr"
        ? row.description_tr
        : row.description_en;

  const images = [...(row.product_images ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => img.image_url);
  const sizes = [...(row.product_sizes ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => s.label);
  const colors = [...(row.product_colors ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => (locale === "ar" ? c.label_ar : locale === "tr" ? c.label_tr : c.label_en));
  const quantities = [...(row.product_quantities ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((q) => ({
      label: locale === "ar" ? q.label_ar : locale === "tr" ? q.label_tr : q.label_en,
      price: q.price,
    }));

  return {
    id: row.id,
    name,
    description,
    price: row.price,
    category: row.category,
    createdAt: row.created_at,
    images,
    sizes,
    colors,
    quantities,
  };
}

export function localizeCategory(row: CategoryRow, locale: Locale): string {
  return locale === "ar" ? row.label_ar : locale === "tr" ? row.label_tr : row.label_en;
}

/** The admin-entered short description for a category, in the given
 * language — null when nothing has been entered yet (blank/whitespace
 * counts as not entered), so callers can fall back to generic copy. */
export function localizeCategoryDescription(
  row: CategoryRow,
  locale: Locale
): string | null {
  const value =
    locale === "ar" ? row.description_ar : locale === "tr" ? row.description_tr : row.description_en;
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
