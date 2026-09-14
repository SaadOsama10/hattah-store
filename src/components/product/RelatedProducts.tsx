import { getTranslations, getLocale } from "next-intl/server";
import { ProductCard } from "@/components/ui/ProductCard";
import { Divider } from "@/components/ui/Divider";
import {
  localizeProduct,
  localizeCategory,
  type ProductRow,
  type CategoryRow,
  type Locale,
} from "@/lib/supabase/types";

export async function RelatedProducts({
  products,
  categories,
}: {
  products: ProductRow[];
  categories: CategoryRow[];
}) {
  if (products.length === 0) return null;

  const t = await getTranslations("product");
  const locale = (await getLocale()) as Locale;
  const categoryLabelByKey = Object.fromEntries(
    categories.map((c) => [c.key, localizeCategory(c, locale)])
  );

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <div className="mb-10 text-center">
        <h2 className="font-playfair text-3xl font-bold text-cream sm:text-4xl">
          {t("relatedTitle")}
        </h2>
        <Divider className="mt-5" />
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4">
        {products.map((product) => {
          const localized = localizeProduct(product, locale);
          return (
            <ProductCard
              key={product.id}
              id={localized.id}
              name={localized.name}
              price={localized.price}
              image={localized.images[0]}
              categoryLabel={categoryLabelByKey[localized.category]}
              hasVariants={
                localized.sizes.length > 0 || localized.colors.length > 0 || localized.quantities.length > 0
              }
            />
          );
        })}
      </div>
    </section>
  );
}
