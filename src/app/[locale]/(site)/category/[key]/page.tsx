import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShopClient } from "@/components/shop/ShopClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { getDescendantKeys } from "@/lib/categories";
import { buildShopCategories, buildShopItems, parseSort } from "@/lib/shop-data";
import { getBestSellerRanking } from "@/lib/supabase/bestsellers";
import { getAllProducts, getCachedCategories, getCategories } from "@/lib/supabase/queries";
import { localizeCategory, localizeCategoryDescription, localizeProduct, type Locale } from "@/lib/supabase/types";
import { breadcrumbJsonLd, buildMetadata, categoryPath, itemListJsonLd, pagePath, productPath } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; key: string }> }): Promise<Metadata> {
  const { locale, key } = await params;
  const categories = await getCategories();
  const cat = categories.find((c) => c.key === key);
  if (!cat) return { title: "HATTAH", robots: { index: false } };
  const t = await getTranslations({ locale, namespace: "seo" });
  const label = localizeCategory(cat, locale as Locale);
  const own = localizeCategoryDescription(cat, locale as Locale);
  return buildMetadata({
    locale,
    path: categoryPath(key),
    title: t("categoryTitle", { name: label }),
    description: (own ? `${label} — ${own}. ` : "") + t("categoryDescription", { name: label }),
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; key: string }>;
  searchParams: Promise<{ category?: string; sort?: string; q?: string }>;
}) {
  const { locale, key } = await params;
  const { category: sub, sort, q } = await searchParams;
  setRequestLocale(locale);
  const loc = locale as Locale;

  const [categories, products, ranking, tSeo] = await Promise.all([
    getCachedCategories(),
    getAllProducts(),
    getBestSellerRanking(),
    getTranslations("seo"),
  ]);
  const cat = categories.find((c) => c.key === key);
  if (!cat) notFound();

  const label = localizeCategory(cat, loc);
  const keys = new Set(getDescendantKeys(categories, key));
  const rows = products.filter((p) => keys.has(p.category));
  const localized = rows.map((p) => localizeProduct(p, loc));
  const description = localizeCategoryDescription(cat, loc);
  const parent = cat.parent_key ? categories.find((c) => c.key === cat.parent_key) : undefined;
  const scopeNode = buildShopCategories(categories, loc).find((c) => c.key === key) ?? {
    key,
    label,
    keys: [key],
    children: [],
  };

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: tSeo("home"), path: pagePath(locale) },
            { name: tSeo("shop"), path: pagePath(locale, "/shop") },
            ...(parent ? [{ name: localizeCategory(parent, loc), path: pagePath(locale, categoryPath(parent.key)) }] : []),
            { name: label, path: pagePath(locale, categoryPath(key)) },
          ]),
          itemListJsonLd(label, rows.slice(0, 50).map((p, i) => ({ name: localized[i].name, path: pagePath(locale, productPath(p)) }))),
        ]}
      />
      <PageHeader
        title={label}
        eyebrow={parent ? localizeCategory(parent, loc) : tSeo("categories")}
        description={description}
        crumbs={[
          { label: tSeo("home"), href: "/" },
          { label: tSeo("shop"), href: "/shop" },
          ...(parent ? [{ label: localizeCategory(parent, loc), href: categoryPath(parent.key) }] : []),
          { label },
        ]}
      />
      <ShopClient
        items={buildShopItems(rows, categories, ranking, loc)}
        categories={[scopeNode]}
        scope={key}
        initialCategory={sub && scopeNode.children.some((c) => c.key === sub) ? sub : "all"}
        initialSort={parseSort(sort)}
        initialQuery={(q ?? "").slice(0, 80)}
      />
    </>
  );
}
