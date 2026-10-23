import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Gallery } from "@/components/product/Gallery";
import { ProductPurchaseActions } from "@/components/product/ProductPurchaseActions";
import { RelatedProducts } from "@/components/product/RelatedProducts";
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
  getRelatedProducts,
  getCategories,
} from "@/lib/supabase/queries";
import { localizeProduct, localizeCategory, type Locale } from "@/lib/supabase/types";
import { ChevronLeft } from "lucide-react";

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

  const [related, categories] = await Promise.all([
    getRelatedProducts(product.category, product.id, 4),
    getCategories(),
  ]);

  const t = await getTranslations("product");
  const tCommon = await getTranslations("common");
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
    <div className="pt-28 sm:pt-32">
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
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 font-inter text-xs text-cream-secondary/70">
          <Link href="/" className="hover:text-terracotta">{tSeo("home")}</Link>
          <span aria-hidden>/</span>
          <Link href="/shop" className="hover:text-terracotta">{tSeo("shop")}</Link>
          {categoryRow && (
            <>
              <span aria-hidden>/</span>
              <Link href={categoryPath(categoryRow.key) as "/category/[key]"} className="hover:text-terracotta">{categoryLabel}</Link>
            </>
          )}
        </nav>
        <Link
          href="/shop"
          className="mb-8 inline-flex items-center gap-2 font-inter text-xs uppercase tracking-widest text-cream-secondary/70 transition-colors hover:text-terracotta"
        >
          <ChevronLeft size={14} className="rtl:-scale-x-100" />
          {tCommon("backToShop")}
        </Link>

        <div className="grid grid-cols-1 gap-10 pb-20 lg:grid-cols-2 lg:gap-16">
          <Gallery images={localized.images} alt={imageAlt} />

          <div className="flex flex-col justify-center">
            {categoryLabel && (
              <span className="mb-3 font-inter text-xs uppercase tracking-[0.25em] text-terracotta">
                {categoryLabel}
              </span>
            )}
            <h1 className="font-playfair text-3xl font-bold leading-tight text-cream sm:text-4xl">
              {localized.name}
            </h1>

            <div className="my-8 h-px w-full max-w-xs bg-gradient-to-r from-olive/50 to-transparent" />

            <ProductPurchaseActions
              product={{
                id: localized.id,
                name: localized.name,
                price: localized.price,
                salePrice: localized.salePrice,
                image: localized.images[0],
              }}
              sizes={localized.sizes}
              colors={localized.colors}
              quantities={localized.quantities}
            />

            {localized.description && (
              <div className="mt-8">
                <h2 className="mb-2 font-inter text-xs uppercase tracking-widest text-cream-secondary/50">
                  {t("description")}
                </h2>
                <p className="whitespace-pre-line font-inter leading-loose text-cream-secondary/90">
                  {localized.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <RelatedProducts products={related} categories={categories} />
    </div>
  );
}
