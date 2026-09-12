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
  created_at: string;
  product_images: ProductImageRow[];
  product_sizes: ProductSizeRow[];
  product_colors: ProductColorRow[];
}

export interface LocalizedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: CategoryKey;
  createdAt: string;
  images: string[];
  // Sizes are plain admin-entered labels (not localized). Colors are
  // resolved to the current site language below, same as name/description.
  sizes: string[];
  colors: string[];
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
  };
}

export function localizeCategory(row: CategoryRow, locale: Locale): string {
  return locale === "ar" ? row.label_ar : locale === "tr" ? row.label_tr : row.label_en;
}
