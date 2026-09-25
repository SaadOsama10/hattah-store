"use client";

import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  localizeProduct,
  localizeCategory,
  type ProductRow,
  type CategoryRow,
  type Locale,
} from "@/lib/supabase/types";

export function FeaturedProducts({
  products,
  categories,
}: {
  products: ProductRow[];
  categories: CategoryRow[];
}) {
  const t = useTranslations("featured");
  const locale = useLocale() as Locale;
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByAmount(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const isRtl = document.documentElement.dir === "rtl";
    const amount = el.clientWidth * 0.8 * (isRtl ? -1 : 1) * dir;
    el.scrollBy({ left: amount, behavior: "smooth" });
  }

  const categoryLabelByKey = Object.fromEntries(
    categories.map((c) => [c.key, localizeCategory(c, locale)])
  );

  if (products.length === 0) return null;

  return (
    <SectionWrapper className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <div className="mb-12 flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-end">
        <div className="text-center sm:text-start">
          <Badge>{t("eyebrow")}</Badge>
          <h2 className="mt-4 font-playfair text-4xl font-extrabold text-cream sm:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-3 font-inter text-cream-secondary/70">{t("subtitle")}</p>
        </div>

        <div className="hidden gap-3 sm:flex">
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            aria-label="Previous"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/20 text-cream transition-colors hover:border-terracotta hover:text-terracotta"
          >
            <ChevronLeft size={18} className="rtl:-scale-x-100" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            aria-label="Next"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/20 text-cream transition-colors hover:border-terracotta hover:text-terracotta"
          >
            <ChevronRight size={18} className="rtl:-scale-x-100" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-none flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4"
      >
        {products.map((product) => {
          const localized = localizeProduct(product, locale);
          return (
            <div
              key={product.id}
              className="w-[75%] shrink-0 snap-start sm:w-[42%] lg:w-[24%]"
            >
              <ProductCard
                id={localized.id}
                name={localized.name}
                price={localized.price}
                salePrice={localized.salePrice}
                image={localized.images[0]}
                categoryLabel={categoryLabelByKey[localized.category]}
                hasVariants={
                  localized.sizes.length > 0 || localized.colors.length > 0 || localized.quantities.length > 0
                }
              />
            </div>
          );
        })}
      </div>

      <div className="mt-14 flex justify-center">
        <Button href="/shop" variant="secondary" size="md">
          {t("cta")}
        </Button>
      </div>
    </SectionWrapper>
  );
}
