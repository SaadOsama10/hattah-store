import { setRequestLocale } from "next-intl/server";
import { ShopClient } from "@/components/shop/ShopClient";
import { getAllProducts, getCategories } from "@/lib/supabase/queries";
import type { CategoryKey } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category } = await searchParams;
  setRequestLocale(locale);

  const [products, categories] = await Promise.all([
    getAllProducts(),
    getCategories(),
  ]);

  const validCategory = categories.some((c) => c.key === category)
    ? (category as CategoryKey)
    : "all";

  return (
    <ShopClient
      products={products}
      categories={categories}
      initialCategory={validCategory}
    />
  );
}
