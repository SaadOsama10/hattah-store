import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Gallery } from "@/components/product/Gallery";
import { ProductPurchaseActions } from "@/components/product/ProductPurchaseActions";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { Link } from "@/i18n/navigation";
import {
  getProductById,
  getRelatedProducts,
  getCategories,
} from "@/lib/supabase/queries";
import { localizeProduct, localizeCategory, type Locale } from "@/lib/supabase/types";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const product = await getProductById(id);
  if (!product) notFound();

  const [related, categories] = await Promise.all([
    getRelatedProducts(product.category, product.id, 4),
    getCategories(),
  ]);

  const t = await getTranslations("product");
  const tCommon = await getTranslations("common");
  const localized = localizeProduct(product, locale as Locale);
  const categoryRow = categories.find((c) => c.key === product.category);
  const categoryLabel = categoryRow ? localizeCategory(categoryRow, locale as Locale) : "";

  return (
    <div className="pt-28 sm:pt-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Link
          href="/shop"
          className="mb-8 inline-flex items-center gap-2 font-inter text-xs uppercase tracking-widest text-cream-secondary/70 transition-colors hover:text-terracotta"
        >
          <ChevronLeft size={14} className="rtl:-scale-x-100" />
          {tCommon("backToShop")}
        </Link>

        <div className="grid grid-cols-1 gap-10 pb-20 lg:grid-cols-2 lg:gap-16">
          <Gallery images={localized.images} alt={localized.name} />

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
