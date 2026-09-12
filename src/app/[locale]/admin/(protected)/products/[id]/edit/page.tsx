import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ProductForm } from "@/components/admin/ProductForm";
import { getCategories, getProductById } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [product, categories, t] = await Promise.all([
    getProductById(id),
    getCategories(),
    getTranslations("admin.form"),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="mb-8 font-playfair text-3xl font-bold text-cream">{t("editTitle")}</h1>
      <ProductForm
        mode="edit"
        categories={categories}
        initialData={{
          id: product.id,
          name_ar: product.name_ar,
          name_en: product.name_en,
          name_tr: product.name_tr,
          description_ar: product.description_ar,
          description_en: product.description_en,
          description_tr: product.description_tr,
          price: product.price,
          category: product.category,
          is_featured: product.is_featured,
          has_sizes: product.has_sizes,
          has_colors: product.has_colors,
          sizes: [...product.product_sizes]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((s) => s.label),
          colors: [...product.product_colors]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((c) => ({ label_ar: c.label_ar, label_en: c.label_en, label_tr: c.label_tr })),
          images: [...product.product_images]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((img) => ({ id: img.id, url: img.image_url })),
        }}
      />
    </div>
  );
}
