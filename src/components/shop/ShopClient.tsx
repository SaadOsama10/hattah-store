"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "@/components/ui/ProductCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { playClick } from "@/lib/sound";
import { buildCategoryTree, getDescendantKeys } from "@/lib/categories";
import {
  localizeProduct,
  localizeCategory,
  type ProductRow,
  type CategoryRow,
  type CategoryKey,
  type Locale,
} from "@/lib/supabase/types";

const PAGE_SIZE = 12;

export function ShopClient({
  products,
  categories,
  initialCategory,
}: {
  products: ProductRow[];
  categories: CategoryRow[];
  initialCategory: CategoryKey | "all";
}) {
  const t = useTranslations("shop");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  // A deep-link (?category=<subcategory key>) should land on its parent
  // tab with the subcategory pill already active.
  const initialRow = categories.find((c) => c.key === initialCategory);
  const [activeParent, setActiveParent] = useState<CategoryKey | "all">(
    initialRow ? (initialRow.parent_key ?? initialRow.key) : "all"
  );
  const [activeChild, setActiveChild] = useState<CategoryKey | "all">(
    initialRow?.parent_key ? initialRow.key : "all"
  );
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const activeParentNode = categoryTree.find((c) => c.key === activeParent);

  function selectParent(key: CategoryKey | "all") {
    playClick();
    setActiveParent(key);
    setActiveChild("all");
    setVisibleCount(PAGE_SIZE);
  }

  function selectChild(key: CategoryKey | "all") {
    playClick();
    setActiveChild(key);
    setVisibleCount(PAGE_SIZE);
  }

  const localized = useMemo(
    () => products.map((p) => localizeProduct(p, locale)),
    [products, locale]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowedKeys =
      activeParent === "all"
        ? null
        : activeChild !== "all"
          ? [activeChild]
          : getDescendantKeys(categories, activeParent);

    return localized.filter((p) => {
      const matchesCategory = !allowedKeys || allowedKeys.includes(p.category);
      const matchesQuery = !q || p.name.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [localized, activeParent, activeChild, categories, query]);

  const visible = filtered.slice(0, visibleCount);
  const categoryLabelByKey = Object.fromEntries(
    categories.map((c) => [c.key, localizeCategory(c, locale)])
  );

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8 sm:pt-36">
      <div className="mb-12 text-center">
        <h1 className="font-playfair text-4xl font-bold text-cream sm:text-5xl">{t("title")}</h1>
        <p className="mx-auto mt-3 max-w-xl font-inter text-cream-secondary/70">
          {t("subtitle")}
        </p>
      </div>

      <div className="mb-10 flex flex-col gap-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal size={15} className="me-1 text-cream-secondary/50" />
            <button
              type="button"
              onClick={() => selectParent("all")}
              className={cn(
                "rounded-full border px-4 py-2 font-inter text-xs uppercase tracking-widest transition-all duration-300 hover:-translate-y-0.5",
                activeParent === "all"
                  ? "border-terracotta bg-terracotta text-cream shadow-glow-terracotta"
                  : "border-cream/20 text-cream-secondary hover:border-cream/50"
              )}
            >
              {t("filterAll")}
            </button>
            {categoryTree.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => selectParent(cat.key as CategoryKey)}
                className={cn(
                  "rounded-full border px-4 py-2 font-inter text-xs uppercase tracking-widest transition-all duration-300 hover:-translate-y-0.5",
                  activeParent === cat.key
                    ? "border-terracotta bg-terracotta text-cream shadow-glow-terracotta"
                    : "border-cream/20 text-cream-secondary hover:border-cream/50"
                )}
              >
                {localizeCategory(cat, locale)}
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-cream-secondary/50"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-full border border-cream/20 bg-bg-secondary py-2.5 ps-10 pe-4 font-inter text-sm text-cream placeholder:text-cream-secondary/40 focus:border-terracotta focus:outline-none"
            />
          </div>
        </div>

        <AnimatePresence>
          {activeParentNode && activeParentNode.children.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-2 ps-6"
            >
              <button
                type="button"
                onClick={() => selectChild("all")}
                className={cn(
                  "rounded-full border px-3 py-1.5 font-inter text-[11px] uppercase tracking-widest transition-colors",
                  activeChild === "all"
                    ? "border-forest bg-forest/15 text-forest"
                    : "border-cream/15 text-cream-secondary/70 hover:border-cream/40"
                )}
              >
                {t("allSubcategories")}
              </button>
              {activeParentNode.children.map((child) => (
                <button
                  key={child.key}
                  type="button"
                  onClick={() => selectChild(child.key as CategoryKey)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 font-inter text-[11px] uppercase tracking-widest transition-colors",
                    activeChild === child.key
                      ? "border-forest bg-forest/15 text-forest"
                      : "border-cream/15 text-cream-secondary/70 hover:border-cream/40"
                  )}
                >
                  {localizeCategory(child, locale)}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="mb-6 font-inter text-xs uppercase tracking-widest text-cream-secondary/50">
        {filtered.length} {t("resultsCount")}
      </p>

      {filtered.length === 0 ? (
        <p className="py-24 text-center font-inter text-cream-secondary/60">
          {t("noProducts")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                image={product.images[0]}
                categoryLabel={categoryLabelByKey[product.category]}
                hasVariants={
                  product.sizes.length > 0 || product.colors.length > 0 || product.quantities.length > 0
                }
              />
            ))}
          </div>

          {visibleCount < filtered.length && (
            <div className="mt-14 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              >
                {tCommon("loadMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
