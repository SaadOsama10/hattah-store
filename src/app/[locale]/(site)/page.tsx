import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/Hero";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { OurStory } from "@/components/home/OurStory";
import {
  getCategories,
  getCategoryCoverImages,
  getFeaturedProducts,
  getProductCountsByCategory,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const categories = await getCategories();
  const [featuredProducts, coverImages, productCounts] = await Promise.all([
    getFeaturedProducts(8),
    getCategoryCoverImages(categories),
    getProductCountsByCategory(),
  ]);

  return (
    <>
      <Hero />
      <CategoryTiles
        categories={categories}
        coverImages={coverImages}
        productCounts={productCounts}
      />
      <FeaturedProducts products={featuredProducts} categories={categories} />
      <OurStory />
    </>
  );
}
