import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, categoryPath, organizationGraph } from "@/lib/seo";
import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/home/Marquee";
import { FeaturedGrid } from "@/components/home/FeaturedGrid";
import { OurStory } from "@/components/home/OurStory";
import { FinalCta } from "@/components/home/FinalCta";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import type { TileData } from "@/components/home/CategoryTileCard";
import { OffersBanner } from "@/components/home/OffersBanner";
import { ProductRail } from "@/components/home/ProductRail";
import { getAllProducts, getCachedCategories, hasActiveOffers } from "@/lib/supabase/queries";
import { getBestSellerRanking } from "@/lib/supabase/bestsellers";
import { buildCategoryTree, getDescendantKeys } from "@/lib/categories";
import { HOME_SECTION_ICONS, RAIL_LIMIT, byRank, inCategories, tileImages, toCardProduct } from "@/lib/storefront";
import { localizeCategory, type Locale, type ProductRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildMetadata({ locale, title: t("title"), description: t("description") });
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as Locale;

  const [products, categories, ranking, offersActive, t] = await Promise.all([
    getAllProducts(),
    getCachedCategories(),
    getBestSellerRanking(),
    hasActiveOffers(),
    getTranslations("home"),
  ]);
  const card = (p: ProductRow) => toCardProduct(p, locale, categories);

  /* Category tiles: photos from each category's own top products. */
  const tree = buildCategoryTree(categories);
  const tiles: TileData[] = tree.map((cat) => {
    const keys = new Set(getDescendantKeys(categories, cat.key));
    return {
      key: cat.key,
      label: localizeCategory(cat, locale),
      href: categoryPath(cat.key),
      image: tileImages(products.filter((p) => keys.has(p.category)), ranking, 1)[0],
    };
  });

  /* Rails */
  const best = ranking
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is ProductRow => !!p)
    .slice(0, RAIL_LIMIT);
  // Too few products with sales data yet → top up with the store's featured picks.
  if (best.length < 4) for (const p of products) if (p.is_featured && !best.includes(p) && best.length < RAIL_LIMIT) best.push(p);

  // Story sections: top-level categories chosen by their admin-set icon.
  const sectionKeys = (icons: readonly string[]) => tree.filter((c) => icons.includes(c.icon_key)).map((c) => c.key);
  const foodKeys = sectionKeys(HOME_SECTION_ICONS.food);
  const giftKeys = sectionKeys(HOME_SECTION_ICONS.gifts);
  const food = byRank(inCategories(products, categories, foodKeys), ranking).slice(0, RAIL_LIMIT);
  const gifts = byRank(inCategories(products, categories, giftKeys), ranking).slice(0, RAIL_LIMIT);
  const newest = [...products].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, RAIL_LIMIT);

  const sectionLink = (keys: readonly string[]) => (keys.length === 1 ? categoryPath(keys[0]) : "/shop");

  // Featured selection: the admin's "featured" products, best sellers first.
  const featured = byRank(products.filter((p) => p.is_featured), ranking).slice(0, 8);

  return (
    <>
      <JsonLd data={organizationGraph(locale)} />
      <Hero />
      <Marquee />
      <CategoryTiles tiles={tiles} />
      <FeaturedGrid products={featured.map(card)} />
      <ProductRail
        id="best"
        products={best.map(card)}
        title={t("bestTitle")}
        subtitle={t("bestSubtitle")}
        action={{ href: "/shop?sort=best", label: t("seeAll") }}
      />
      <OurStory />
      <ProductRail
        id="food"
        products={food.map(card)}
        title={t("foodTitle")}
        subtitle={t("foodSubtitle")}
        action={{ href: sectionLink(foodKeys), label: t("seeAll") }}
        tone="plain"
      />
      {offersActive && <OffersBanner />}
      <ProductRail
        id="gifts"
        products={gifts.map(card)}
        title={t("giftsTitle")}
        subtitle={t("giftsSubtitle")}
        action={{ href: sectionLink(giftKeys), label: t("seeAll") }}
        tone="cream"
      />
      <ProductRail
        id="new"
        products={newest.map(card)}
        title={t("newTitle")}
        subtitle={t("newSubtitle")}
        action={{ href: "/shop", label: t("seeAll") }}
      />
      <FinalCta />
    </>
  );
}
