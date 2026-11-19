import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, organizationGraph, productImageAlt } from "@/lib/seo";
import { Hero, type HeroPiece } from "@/components/home/Hero";
import { TrustStrip } from "@/components/home/TrustStrip";
import { CategoryTiles, type CategoryTile } from "@/components/home/CategoryTiles";
import { OffersBanner } from "@/components/home/OffersBanner";
import { ProductRail } from "@/components/home/ProductRail";
import { AboutHattah } from "@/components/home/AboutHattah";
import { WhatsAppCta } from "@/components/home/WhatsAppCta";
import { getAllProducts, getCachedCategories, hasActiveOffers } from "@/lib/supabase/queries";
import { getBestSellerRanking } from "@/lib/supabase/bestsellers";
import { buildCategoryTree, getDescendantKeys } from "@/lib/categories";
import { HERO, HOME_SECTIONS, RAIL_LIMIT, byRank, inCategories, toCardProduct } from "@/lib/storefront";
import { localizeCategory, localizeProduct, type Locale, type ProductRow } from "@/lib/supabase/types";
import { productSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildMetadata({ locale, title: t("title"), description: t("description") });
}

const firstImage = (p: ProductRow) => [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;

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

  /* Hero: the configured product photo, else the first featured product's photo. */
  const heroRow =
    products.find((p) => p.id.startsWith(HERO.productShortId)) ?? products.find((p) => p.is_featured && firstImage(p));
  let piece: HeroPiece | null = null;
  if (heroRow) {
    const lp = localizeProduct(heroRow, locale);
    const image = lp.images[heroRow.id.startsWith(HERO.productShortId) ? HERO.imageIndex : 0] ?? lp.images[0];
    const cat = categories.find((c) => c.key === heroRow.category);
    const alt = productImageAlt(
      lp.name,
      cat ? localizeCategory(cat, locale) : "",
      locale === "ar" ? heroRow.image_alt_ar : locale === "tr" ? heroRow.image_alt_tr : heroRow.image_alt_en
    );
    if (image) piece = { image, alt, name: lp.name, href: `/product/${productSlug(heroRow)}` };
  }

  /* Category tiles: top-level categories, photo from one of their own products (featured first). */
  const tiles: CategoryTile[] = buildCategoryTree(categories).map((cat) => {
    const keys = new Set(getDescendantKeys(categories, cat.key));
    const inCat = products.filter((p) => keys.has(p.category));
    const ranked = byRank(inCat.filter(firstImage), ranking);
    const pick = ranked.find((p) => p.is_featured) ?? ranked[0];
    return { category: cat, image: pick ? firstImage(pick) : undefined, count: inCat.length };
  });

  /* Rails */
  const best = ranking
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is ProductRow => !!p)
    .slice(0, RAIL_LIMIT);
  // Too few products with sales data yet → top up with the store's featured picks.
  if (best.length < 4) for (const p of products) if (p.is_featured && !best.includes(p) && best.length < RAIL_LIMIT) best.push(p);

  const food = byRank(inCategories(products, categories, HOME_SECTIONS.food), ranking).slice(0, RAIL_LIMIT);
  const gifts = byRank(inCategories(products, categories, HOME_SECTIONS.gifts), ranking).slice(0, RAIL_LIMIT);
  const newest = [...products].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, RAIL_LIMIT);

  const sectionLink = (keys: readonly string[]) =>
    keys.length === 1 ? `/category/${keys[0]}` : "/shop";

  return (
    <>
      <JsonLd data={organizationGraph(locale)} />
      <Hero piece={piece} />
      <TrustStrip />
      <CategoryTiles tiles={tiles} locale={locale} />
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
        action={{ href: sectionLink(HOME_SECTIONS.food), label: t("seeAll") }}
      />
      {offersActive && <OffersBanner />}
      <ProductRail
        id="gifts"
        products={gifts.map(card)}
        eyebrow={t("giftsEyebrow")}
        title={t("giftsTitle")}
        subtitle={t("giftsSubtitle")}
        action={{ href: sectionLink(HOME_SECTIONS.gifts), label: t("seeAll") }}
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
