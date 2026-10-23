import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductCard } from "@/components/ui/ProductCard";
import { Divider } from "@/components/ui/Divider";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCategoryTree, getDescendantKeys } from "@/lib/categories";
import { getAllProducts, getCategories } from "@/lib/supabase/queries";
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

export default async function CategoryPage({ params }: { params: Promise<{ locale: string; key: string }> }) {
  const { locale, key } = await params;
  setRequestLocale(locale);

  const [categories, products, tSeo, tShop] = await Promise.all([
    getCategories(),
    getAllProducts(),
    getTranslations("seo"),
    getTranslations("common"),
  ]);
  const cat = categories.find((c) => c.key === key);
  if (!cat) notFound();

  const label = localizeCategory(cat, locale as Locale);
  const keys = new Set(getDescendantKeys(categories, key));
  const rows = products.filter((p) => keys.has(p.category));
  const localized = rows.map((p) => localizeProduct(p, locale as Locale));
  const labelByKey = Object.fromEntries(categories.map((c) => [c.key, localizeCategory(c, locale as Locale)]));
  const children = buildCategoryTree(categories).find((n) => n.key === key)?.children ?? [];
  const description = localizeCategoryDescription(cat, locale as Locale);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8 sm:pt-36">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: tSeo("home"), path: pagePath(locale) },
            { name: tSeo("shop"), path: pagePath(locale, "/shop") },
            { name: label, path: pagePath(locale, categoryPath(key)) },
          ]),
          itemListJsonLd(label, rows.slice(0, 50).map((p, i) => ({ name: localized[i].name, path: pagePath(locale, productPath(p)) }))),
        ]}
      />
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 font-inter text-xs text-cream-secondary/70">
        <Link href="/" className="hover:text-terracotta">{tSeo("home")}</Link>
        <span aria-hidden>/</span>
        <Link href="/shop" className="hover:text-terracotta">{tSeo("shop")}</Link>
      </nav>
      <div className="mb-10 text-center">
        <h1 className="font-playfair text-4xl font-bold text-cream sm:text-5xl">{label}</h1>
        {description && <p className="mx-auto mt-3 max-w-xl font-inter text-cream-secondary/70">{description}</p>}
        <Divider className="mt-6" />
      </div>

      {children.length > 0 && (
        <ul className="mb-10 flex flex-wrap justify-center gap-2">
          {children.map((c) => (
            <li key={c.key}>
              <Link href={categoryPath(c.key) as "/category/[key]"} className="rounded-full border border-cream/20 px-4 py-1.5 font-inter text-sm text-cream-secondary hover:border-terracotta hover:text-terracotta">
                {localizeCategory(c, locale as Locale)}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {localized.length === 0 ? (
        <div className="py-20 text-center">
          <Button href="/shop" variant="secondary">{tShop("backToShop")}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {localized.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              slug={p.slug}
              name={p.name}
              price={p.startingPrice}
              salePrice={p.salePrice}
              image={p.images[0]}
              categoryLabel={labelByKey[p.category]}
              startingFrom={p.quantities.length > 0}
              hasVariants={p.sizes.length > 0 || p.colors.length > 0 || p.quantities.length > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
