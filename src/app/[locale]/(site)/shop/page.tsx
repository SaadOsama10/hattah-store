import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo";
import { ShopClient } from "@/components/shop/ShopClient";
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
  const validCategory = categories.some((c) => c.key === category) ? category! : "all";

  return (
    <>
      <div className="mx-auto max-w-7xl px-gutter pb-4 pt-8 sm:pt-10">
        <h1 className="font-playfair text-h2 font-bold text-cream">{t("title")}</h1>
        <p className="mt-1.5 max-w-xl font-inter text-sm text-cream-secondary sm:text-base">{t("subtitle")}</p>
      </div>
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
