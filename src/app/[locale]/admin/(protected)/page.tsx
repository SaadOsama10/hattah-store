import { setRequestLocale } from "next-intl/server";
import { ProductTable } from "@/components/admin/ProductTable";
import { getAllProducts, getCategories } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [products, categories] = await Promise.all([getAllProducts(), getCategories()]);

  return <ProductTable products={products} categories={categories} />;
}
