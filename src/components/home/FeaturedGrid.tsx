import { getTranslations } from "next-intl/server";
import { ProductCard } from "@/components/ui/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Band } from "@/components/ui/Band";
import type { CardProduct } from "@/lib/storefront";

/** The store's featured products (admin "featured" flag) as a 4/2-column grid. */
export async function FeaturedGrid({ products }: { products: CardProduct[] }) {
  const t = await getTranslations("home");
  if (products.length === 0) return null;
  return (
    <Band tone="cream" labelledBy="home-featured" className="cv-auto py-section">
      <div className="mx-auto max-w-7xl px-gutter">
        <Reveal blur>
          <SectionHeading
            id="home-featured"
            eyebrow={t("featuredEyebrow")}
            title={t("featuredTitle")}
            subtitle={t("featuredSubtitle")}
            action={{ href: "/shop", label: t("seeAll") }}
          />
        </Reveal>
        <ul className="grid grid-cols-2 gap-x-3.5 gap-y-9 sm:gap-x-5 lg:grid-cols-4">
          {products.map((p, i) => (
            <Reveal as="li" key={p.id} delay={(i % 4) * 80}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </ul>
      </div>
    </Band>
  );
}
