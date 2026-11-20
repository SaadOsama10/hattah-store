import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { ShopClient } from "@/components/shop/ShopClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAllProducts, getCachedCategories } from "@/lib/supabase/queries";
import { getBestSellerRanking } from "@/lib/supabase/bestsellers";
import { buildShopCategories, buildShopItems, parseSort } from "@/lib/shop-data";
import type { Locale } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  // ?category= / ?sort= / ?q= are the same page — canonical stays /shop.
  return buildMetadata({ locale, path: "/shop", title: t("shopTitle"), description: t("shopDescription") });
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; sort?: string; q?: string }>;
}) {
  const { locale } = await params;
  const { category, sort, q } = await searchParams;
  setRequestLocale(locale);

  const [products, categories, ranking, t] = await Promise.all([
    getAllProducts(),
    getCachedCategories(),
    getBestSellerRanking(),
    getTranslations("shop"),
  ]);
  const tSeo = await getTranslations("seo");
  const validCategory = categories.some((c) => c.key === category) ? category! : "all";

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        crumbs={[{ label: tSeo("home"), href: "/" }, { label: t("title") }]}
      />
      <ShopClient
        items={buildShopItems(products, categories, ranking, locale as Locale)}
        categories={buildShopCategories(categories, locale as Locale)}
        initialCategory={validCategory}
        initialSort={parseSort(sort)}
        initialQuery={(q ?? "").slice(0, 80)}
      />
    </>
  );
}
