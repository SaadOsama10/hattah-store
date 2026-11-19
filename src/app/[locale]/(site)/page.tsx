import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, categoryPath, organizationGraph, productImageAlt } from "@/lib/seo";
import { Hero } from "@/components/home/Hero";
import type { HeroSlide } from "@/components/home/HeroCarousel";
import { TrustStrip } from "@/components/home/TrustStrip";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import type { TileData } from "@/components/home/CategoryTileCard";
import { OffersBanner } from "@/components/home/OffersBanner";
import { ProductRail } from "@/components/home/ProductRail";
import { AboutHattah } from "@/components/home/AboutHattah";
import { WhatsAppCta } from "@/components/home/WhatsAppCta";
import { getAllProducts, getCachedCategories, hasActiveOffers } from "@/lib/supabase/queries";
import { getBestSellerRanking } from "@/lib/supabase/bestsellers";
import { buildCategoryTree, getDescendantKeys } from "@/lib/categories";
import { HOME_SECTION_ICONS, RAIL_LIMIT, byRank, inCategories, pickHeroProducts, tileImages, toCardProduct } from "@/lib/storefront";
import { localizeCategory, localizeProduct, type Locale, type ProductRow } from "@/lib/supabase/types";
import { productSlug } from "@/lib/slug";

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
  const catLabel = (key: string) => {
    const c = categories.find((x) => x.key === key);
    return c ? localizeCategory(c, locale) : "";
  };

  /* Hero: the store's most expensive priced products with a photo (live data). */
  const slides: HeroSlide[] = pickHeroProducts(products).map((row) => {
    const lp = localizeProduct(row, locale);
    return {
      id: row.id,
      image: lp.images[0],
      name: lp.name,
      href: `/product/${productSlug(row)}`,
      alt: productImageAlt(
        lp.name,
        catLabel(row.category),
        locale === "ar" ? row.image_alt_ar : locale === "tr" ? row.image_alt_tr : row.image_alt_en
      ),
    };
  });

  /* Category tiles: photos from each category's own top products. */
  const tree = buildCategoryTree(categories);
  const tiles: TileData[] = tree.map((cat) => {
    const keys = new Set(getDescendantKeys(categories, cat.key));
    return {
      key: cat.key,
      label: localizeCategory(cat, locale),
      href: categoryPath(cat.key),
      iconKey: cat.icon_key,
      images: tileImages(products.filter((p) => keys.has(p.category)), ranking),
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

  return (
    <>
      <JsonLd data={organizationGraph(locale)} />
      <Hero slides={slides} />
      <TrustStrip />
      <CategoryTiles tiles={tiles} />
      <ProductRail
        id="best"
        products={best.map(card)}
        eyebrow={t("bestEyebrow")}
        title={t("bestTitle")}
        subtitle={t("bestSubtitle")}
        action={{ href: "/shop?sort=best", label: t("seeAll") }}
        tone="tinted"
      />
      <ProductRail
        id="food"
        products={food.map(card)}
        eyebrow={t("foodEyebrow")}
        title={t("foodTitle")}
        subtitle={t("foodSubtitle")}
        action={{ href: sectionLink(foodKeys), label: t("seeAll") }}
      />
      {offersActive && <OffersBanner />}
      <ProductRail
        id="gifts"
        products={gifts.map(card)}
        eyebrow={t("giftsEyebrow")}
        title={t("giftsTitle")}
        subtitle={t("giftsSubtitle")}
        action={{ href: sectionLink(giftKeys), label: t("seeAll") }}
        tone="tinted"
      />
      <ProductRail
        id="new"
        products={newest.map(card)}
        eyebrow={t("newEyebrow")}
        title={t("newTitle")}
        subtitle={t("newSubtitle")}
        action={{ href: "/shop", label: t("seeAll") }}
      />
      <AboutHattah />
      <WhatsAppCta />
    </>
  );
}
