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

  const [products, categories] = await Promise.all([
    getAllProducts(),
    getCategories(),
  ]);

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
