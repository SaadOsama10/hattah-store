import { setRequestLocale, getTranslations } from "next-intl/server";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/ui/ProductCard";
import { getOnSaleProducts, getCategories } from "@/lib/supabase/queries";
import { localizeProduct, localizeCategory, type Locale } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function OffersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [products, categories, t] = await Promise.all([
    getOnSaleProducts(),
    getCategories(),
    getTranslations("offers"),
  ]);

  const localized = products.map((p) => localizeProduct(p, locale as Locale));
  const categoryLabelByKey = Object.fromEntries(
    categories.map((c) => [c.key, localizeCategory(c, locale as Locale)])
  );

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8 sm:pt-36">
      <div className="mb-12 text-center">
        <h1 className="font-playfair text-4xl font-bold text-cream sm:text-5xl">{t("title")}</h1>
        <p className="mx-auto mt-3 max-w-xl font-inter text-cream-secondary/70">{t("subtitle")}</p>
      </div>

      {localized.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-terracotta/10 text-terracotta/60">
            <Tag size={28} />
          </span>
          <p className="font-inter text-cream">{t("emptyTitle")}</p>
          <p className="font-inter text-sm text-cream-secondary/60">{t("emptyHint")}</p>
          <Button href="/shop" variant="secondary" size="md" className="mt-2">
            {t("emptyCta")}
          </Button>
        </div>
      ) : (
        <>
          <p className="mb-6 font-inter text-xs uppercase tracking-widest text-cream-secondary/50">
            {localized.length} {t("resultsCount")}
          </p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {localized.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                salePrice={product.salePrice}
                image={product.images[0]}
                categoryLabel={categoryLabelByKey[product.category]}
                hasVariants={
                  product.sizes.length > 0 || product.colors.length > 0 || product.quantities.length > 0
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
