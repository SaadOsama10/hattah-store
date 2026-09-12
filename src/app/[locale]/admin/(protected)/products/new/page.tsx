import { setRequestLocale, getTranslations } from "next-intl/server";
import { ProductForm } from "@/components/admin/ProductForm";
import { getCategories } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [categories, t] = await Promise.all([
    getCategories(),
    getTranslations("admin.form"),
  ]);

  return (
    <div>
      <h1 className="mb-8 font-playfair text-3xl font-bold text-cream">{t("addTitle")}</h1>
      <ProductForm mode="create" categories={categories} />
    </div>
  );
}
