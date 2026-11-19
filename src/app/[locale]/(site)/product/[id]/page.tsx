import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Gallery } from "@/components/product/Gallery";
import { ProductPurchaseActions } from "@/components/product/ProductPurchaseActions";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { OrderInfo } from "@/components/product/OrderInfo";
import { KufiyaDivider } from "@/components/ui/KufiyaDivider";
import { getBestSellerRanking } from "@/lib/supabase/bestsellers";
import { getDescendantKeys } from "@/lib/categories";
import { RAIL_LIMIT, byRank } from "@/lib/storefront";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { isUuid, productSlug, shortIdFromSlug } from "@/lib/slug";
import {
  buildMetadata,
  breadcrumbJsonLd,
  categoryPath,
  pagePath,
  productDescription,
  productImageAlt,
  productJsonLd,
  productPath,
  productTitle,
} from "@/lib/seo";
import {
  getProductById,
  getProductByShortId,
  getAllProducts,
  getCategories,
} from "@/lib/supabase/queries";
import { localizeProduct, localizeCategory, type Locale } from "@/lib/supabase/types";
import { ChevronLeft } from "lucide-react";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/** /product/<slug> (canonical) or the legacy /product/<uuid> — same lookup, deduped per request. */
const resolveProduct = cache(async (param: string) => {
  if (isUuid(param)) return getProductById(param);
  const short = shortIdFromSlug(param);
  return short ? getProductByShortId(short) : null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const product = await resolveProduct(id);
  if (!product) return { title: "HATTAH", robots: { index: false } };
  const categories = await getCategories();
  const cat = categories.find((c) => c.key === product.category);
  const localized = localizeProduct(product, locale as Locale);
  const catLabel = cat ? localizeCategory(cat, locale as Locale) : "";
  return buildMetadata({
    locale,
    path: productPath(product),
    title: productTitle(localized.name),
    description: productDescription(locale, localized.name, localized.description, catLabel),
    image: localized.images[0],
    type: "website",
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const product = await resolveProduct(id);
  if (!product) notFound();

  // Old UUID links and renamed products both land on the current canonical slug (permanent redirect).
  const canonical = productSlug(product);
  if (id !== canonical) permanentRedirect(`/${locale}/product/${canonical}`);

  const [allProducts, categories, ranking] = await Promise.all([getAllProducts(), getCategories(), getBestSellerRanking()]);
  // Similar products: same category first, then the rest of the parent category.
  const sameCat = allProducts.filter((p) => p.category === product.category && p.id !== product.id);
  const parentKey = categories.find((c) => c.key === product.category)?.parent_key;
  const siblings = parentKey
    ? allProducts.filter((p) => p.id !== product.id && p.category !== product.category && getDescendantKeys(categories, parentKey).includes(p.category))
    : [];
  const related = [...byRank(sameCat, ranking), ...byRank(siblings, ranking)].slice(0, RAIL_LIMIT);

  const t = await getTranslations("product");
  const localized = localizeProduct(product, locale as Locale);
  const categoryRow = categories.find((c) => c.key === product.category);
  const categoryLabel = categoryRow ? localizeCategory(categoryRow, locale as Locale) : "";

  const tSeo = await getTranslations("seo");
  const imageAlt = productImageAlt(
    localized.name,
    categoryLabel,
    locale === "ar" ? product.image_alt_ar : locale === "tr" ? product.image_alt_tr : product.image_alt_en
  );

  return (
    <div className="pt-4 sm:pt-6">
      <JsonLd
        data={[
          productJsonLd(product, locale as Locale, categoryRow),
          breadcrumbJsonLd([
            { name: tSeo("home"), path: pagePath(locale) },
            { name: tSeo("shop"), path: pagePath(locale, "/shop") },
            ...(categoryRow ? [{ name: categoryLabel, path: pagePath(locale, categoryPath(categoryRow.key)) }] : []),
            { name: localized.name, path: pagePath(locale, productPath(product)) },
          ]),
        ]}
      />
      <div className="mx-auto max-w-7xl px-gutter">
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 font-inter text-sm text-muted">
            <li>
              <Link href="/" className="inline-flex min-h-9 items-center hover:text-terracotta">{tSeo("home")}</Link>
            </li>
            <li aria-hidden><ChevronLeft size={14} className="ltr:rotate-180" /></li>
            <li>
              <Link href="/shop" className="inline-flex min-h-9 items-center hover:text-terracotta">{tSeo("shop")}</Link>
            </li>
            {categoryRow && (
              <>
                <li aria-hidden><ChevronLeft size={14} className="ltr:rotate-180" /></li>
                <li>
                  <Link href={categoryPath(categoryRow.key) as "/category/[key]"} className="inline-flex min-h-9 items-center hover:text-terracotta">
                    {categoryLabel}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden className="hidden sm:block"><ChevronLeft size={14} className="ltr:rotate-180" /></li>
            <li aria-current="page" className="hidden max-w-[16rem] truncate text-cream-secondary sm:block">{localized.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 gap-8 pb-section lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-14">
          <div className="lg:col-start-1 lg:row-start-1">
            <Gallery images={localized.images} alt={imageAlt} />
          </div>

          {/* Buy box — sticky beside the gallery on desktop */}
          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <div className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--header-offset,4rem)+1.5rem)] lg:transition-[top] lg:duration-300">
              <div>
                {categoryRow && (
                  <Link
                    href={categoryPath(categoryRow.key) as "/category/[key]"}
                    className="font-inter text-eyebrow font-semibold uppercase tracking-[0.16em] text-terracotta hover:text-cream"
                  >
                    {categoryLabel}
                  </Link>
                )}
                <h1 className="mt-2 font-playfair text-h2 font-bold text-cream text-balance">{localized.name}</h1>
                <KufiyaDivider align="start" size="sm" className="mt-3" />
              </div>

              <ProductPurchaseActions
                product={{
                  id: localized.id,
                  name: localized.name,
                  price: localized.price,
                  salePrice: localized.salePrice,
                  priceOnRequest: localized.priceOnRequest,
                  url: absoluteUrl(pagePath(locale, productPath(product))),
                  image: localized.images[0],
                }}
                sizes={localized.sizes}
                colors={localized.colors}
                quantities={localized.quantities}
                optionLabel={localized.optionLabel}
              />

              <OrderInfo />
            </div>
          </div>

          {localized.description && (
            <section aria-labelledby="product-description" className="lg:col-start-1 lg:row-start-2">
              <h2 id="product-description" className="font-playfair text-h3 font-bold text-cream">
                {t("description")}
              </h2>
              <p className="mt-3 whitespace-pre-line font-inter leading-loose text-cream-secondary">{localized.description}</p>
            </section>
          )}
        </div>
      </div>

      <RelatedProducts products={related} categories={categories} categoryKey={categoryRow?.key} />
    </div>
  );
}
