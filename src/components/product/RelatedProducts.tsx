import { getLocale, getTranslations } from "next-intl/server";
import { ProductRail } from "@/components/home/ProductRail";
import { categoryPath } from "@/lib/seo";
import { toCardProduct } from "@/lib/storefront";
import type { CategoryRow, Locale, ProductRow } from "@/lib/supabase/types";

/** "Similar products": same category first, topped up from sibling
 * subcategories of the same parent when the category is small. */
export async function RelatedProducts({
  products,
  categories,
  categoryKey,
}: {
  products: ProductRow[];
  categories: CategoryRow[];
  categoryKey?: string;
}) {
  if (products.length === 0) return null;
  const t = await getTranslations("product");
  const tHome = await getTranslations("home");
  const locale = (await getLocale()) as Locale;
  return (
    <ProductRail
      id="similar"
      products={products.map((p) => toCardProduct(p, locale, categories))}
      title={t("similarTitle")}
      action={categoryKey ? { href: categoryPath(categoryKey), label: tHome("seeAll") } : undefined}
      tone="tinted"
    />
  );
}
