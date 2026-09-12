import { setRequestLocale } from "next-intl/server";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { getCategories, getProductCountsByCategory } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [categories, productCounts] = await Promise.all([
    getCategories(),
    getProductCountsByCategory(),
  ]);

  return <CategoryManager categories={categories} productCounts={productCounts} />;
}
