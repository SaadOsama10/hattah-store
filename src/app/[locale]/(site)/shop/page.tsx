import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { ShopClient } from "@/components/shop/ShopClient";
import { getAllProducts, getCategories } from "@/lib/supabase/queries";
import type { CategoryKey } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  // ?category= filters are the same page — canonical stays /shop.
  return buildMetadata({ locale, path: "/shop", title: t("shopTitle"), description: t("shopDescription") });
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category } = await searchParams;
  setRequestLocale(locale);

  const [allProducts, categories] = await Promise.all([
    getAllProducts(),
    getCategories(),
  ]);

  // The client component only needs the card fields; sending every language, description and photo
  // inflated the page payload (and its parse time) several-fold. name_en stays because it builds the slug.
  const products = allProducts.map((p) => ({
    ...p,
    name_ar: locale === "ar" ? p.name_ar : "",
    name_tr: locale === "tr" ? p.name_tr : "",
    name_en: p.name_en,
    description_ar: "",
    description_en: "",
    description_tr: "",
    image_alt_ar: null,
    image_alt_en: null,
    image_alt_tr: null,
    product_images: [...p.product_images].sort((a, b) => a.sort_order - b.sort_order).slice(0, 1),
  }));

  const validCategory = categories.some((c) => c.key === category)
    ? (category as CategoryKey)
    : "all";

  return (
    <ShopClient
      products={products}
      categories={categories}
      initialCategory={validCategory}
    />
  );
}
