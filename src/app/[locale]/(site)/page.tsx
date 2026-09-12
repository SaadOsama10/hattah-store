import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/Hero";
import { CategoryTiles } from "@/components/home/CategoryTiles";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { OurStory } from "@/components/home/OurStory";
import { getCategories, getFeaturedProducts } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [categories, featuredProducts] = await Promise.all([
    getCategories(),
    getFeaturedProducts(8),
  ]);

  return (
    <>
      <Hero />
      <CategoryTiles categories={categories} />
      <FeaturedProducts products={featuredProducts} categories={categories} />
      <OurStory />
    </>
  );
}
