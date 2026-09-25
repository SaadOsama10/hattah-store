"use client";

import { Fragment, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Pencil, Trash2, Plus, ImageOff, Star, Search, Ruler, Palette, Package, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { DeleteConfirmModal } from "@/components/admin/DeleteConfirmModal";
import { deleteProduct } from "@/actions/products";
import { buildCategoryTree, getDescendantKeys } from "@/lib/categories";
import {
  localizeProduct,
  localizeCategory,
  isProductOnSale,
  type ProductRow,
  type CategoryRow,
  type CategoryKey,
  type Locale,
} from "@/lib/supabase/types";

const PAGE_SIZE = 20;

export function ProductTable({
  products,
  categories,
}: {
  products: ProductRow[];
  categories: CategoryRow[];
}) {
  const t = useTranslations("admin.dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(
    null
  );

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | "all">("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const categoryLabelByKey = Object.fromEntries(
    categories.map((c) => [c.key, localizeCategory(c, locale)])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const allowedKeys =
      categoryFilter === "all" ? null : getDescendantKeys(categories, categoryFilter);

    return products.filter((product) => {
      const matchesQuery =
        !q ||
        product.name_ar.toLowerCase().includes(q) ||
        product.name_en.toLowerCase().includes(q) ||
        product.name_tr.toLowerCase().includes(q);
      const matchesCategory = !allowedKeys || allowedKeys.includes(product.category);
      const matchesFeatured = !featuredOnly || product.is_featured;
      return matchesQuery && matchesCategory && matchesFeatured;
    });
  }, [products, query, categoryFilter, featuredOnly, categories]);

  const visible = filtered.slice(0, visibleCount);

  function resetPage() {
    setVisibleCount(PAGE_SIZE);
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    await deleteProduct(pendingDelete.id);
    setPendingDelete(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-cream">{t("title")}</h1>
          <p className="mt-1 font-inter text-sm text-cream-secondary/60">
            {t("subtitle")} · {products.length} {t("productsCount")}
          </p>
        </div>
        <Button href="/admin/products/new" variant="primary">
          <Plus size={16} />
          {t("addProduct")}
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream/15 py-24 text-center">
          <p className="font-inter text-cream-secondary/60">{t("empty")}</p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-cream-secondary/50"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  resetPage();
                }}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-full border border-cream/20 bg-bg-secondary py-2.5 ps-10 pe-4 font-inter text-sm text-cream placeholder:text-cream-secondary/40 focus:border-terracotta focus:outline-none"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as CategoryKey | "all");
                resetPage();
              }}
              className="rounded-full border border-cream/20 bg-bg-secondary px-4 py-2.5 font-inter text-sm text-cream focus:border-terracotta focus:outline-none sm:w-56"
            >
              <option value="all">{t("filterAllCategories")}</option>
              {categoryTree.map((parent) => (
                <Fragment key={parent.key}>
                  <option value={parent.key} className="bg-bg-secondary">
                    {localizeCategory(parent, locale)}
                  </option>
                  {parent.children.map((child) => (
                    <option key={child.key} value={child.key} className="bg-bg-secondary">
                      {"— "}
                      {localizeCategory(child, locale)}
                    </option>
                  ))}
                </Fragment>
              ))}
            </select>

            <div className="sm:w-56">
              <Toggle
                checked={featuredOnly}
                onChange={(v) => {
                  setFeaturedOnly(v);
                  resetPage();
                }}
                label={t("filterFeaturedOnly")}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-cream/15 py-24 text-center">
              <p className="font-inter text-cream-secondary/60">{t("noResults")}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-cream/10">
                <table className="w-full min-w-[720px] border-collapse text-start">
                  <thead>
                    <tr className="border-b border-cream/10 bg-bg-secondary">
                      <th className="px-5 py-3 text-start font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
                        {t("columns.image")}
                      </th>
                      <th className="px-5 py-3 text-start font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
                        {t("columns.name")}
                      </th>
                      <th className="px-5 py-3 text-start font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
                        {t("columns.category")}
                      </th>
                      <th className="px-5 py-3 text-start font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
                        {t("columns.price")}
                      </th>
                      <th className="px-5 py-3 text-end font-inter text-xs uppercase tracking-widest text-cream-secondary/60">
                        {t("columns.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((product) => {
                      const localized = localizeProduct(product, locale);
                      const onSale = isProductOnSale(localized.price, localized.salePrice);
                      return (
                        <tr key={product.id} className="border-b border-cream/5 last:border-0">
                          <td className="px-5 py-3">
                            <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-bg-secondary">
                              {localized.images[0] ? (
                                <Image
                                  src={localized.images[0]}
                                  alt={localized.name}
                                  fill
                                  sizes="56px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-cream/20">
                                  <ImageOff size={18} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 font-inter text-sm text-cream">
                            <span className="flex items-center gap-2">
                              {product.is_featured && (
                                <span title={t("featuredBadge")} className="shrink-0">
                                  <Star
                                    size={14}
                                    className="fill-terracotta text-terracotta"
                                    aria-label={t("featuredBadge")}
                                  />
                                </span>
                              )}
                              {product.has_sizes && (
                                <span title={t("hasSizesIndicator")} className="shrink-0">
                                  <Ruler
                                    size={14}
                                    className="text-cream-secondary/60"
                                    aria-label={t("hasSizesIndicator")}
                                  />
                                </span>
                              )}
                              {product.has_colors && (
                                <span title={t("hasColorsIndicator")} className="shrink-0">
                                  <Palette
                                    size={14}
                                    className="text-cream-secondary/60"
                                    aria-label={t("hasColorsIndicator")}
                                  />
                                </span>
                              )}
                              {product.has_quantities && (
                                <span title={t("hasQuantitiesIndicator")} className="shrink-0">
                                  <Package
                                    size={14}
                                    className="text-cream-secondary/60"
                                    aria-label={t("hasQuantitiesIndicator")}
                                  />
                                </span>
                              )}
                              {onSale && (
                                <span
                                  title={t("onSaleIndicator")}
                                  className="flex shrink-0 items-center gap-1 rounded-full bg-terracotta/15 px-2 py-0.5 text-terracotta"
                                >
                                  <Tag size={11} aria-label={t("onSaleIndicator")} />
                                </span>
                              )}
                              {localized.name}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-inter text-sm text-cream-secondary/70">
                            {categoryLabelByKey[localized.category]}
                          </td>
                          <td className="px-5 py-3 font-inter text-sm">
                            {onSale ? (
                              <span className="flex items-center gap-2">
                                <span className="text-cream-secondary/40 line-through">
                                  {tCommon("currency")} {localized.price.toLocaleString()}
                                </span>
                                <span className="font-semibold text-terracotta">
                                  {tCommon("currency")} {localized.salePrice!.toLocaleString()}
                                </span>
                              </span>
                            ) : (
                              <span className="text-cream-secondary/70">
                                {tCommon("currency")} {localized.price.toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-3">
                              <Link
                                href={`/admin/products/${product.id}/edit`}
                                aria-label="Edit"
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/15 text-cream-secondary transition-colors hover:border-forest hover:text-forest"
                              >
                                <Pencil size={14} />
                              </Link>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingDelete({ id: product.id, name: localized.name })
                                }
                                aria-label="Delete"
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/15 text-cream-secondary transition-colors hover:border-terracotta-deep hover:text-terracotta-deep"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {visibleCount < filtered.length && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                  >
                    {t("loadMore")}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {pendingDelete && (
        <DeleteConfirmModal
          productName={pendingDelete.name}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
