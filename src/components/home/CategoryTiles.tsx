import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { KufiyaNet } from "@/components/ui/KufiyaNet";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { categoryPath } from "@/lib/seo";
import type { CategoryRow, Locale } from "@/lib/supabase/types";
import { localizeCategory } from "@/lib/supabase/types";
import { cn } from "@/lib/cn";

export interface CategoryTile {
  category: CategoryRow;
  image?: string;
  count: number;
}

/** Large photo tiles for the top-level categories (photo = one of the
 * category's own product photos, picked on the server). Bento on
 * desktop: the first tile is double size. */
export async function CategoryTiles({ tiles, locale }: { tiles: CategoryTile[]; locale: Locale }) {
  const t = await getTranslations("home");
  if (tiles.length === 0) return null;

  return (
    <section aria-labelledby="home-categories" className="py-section">
      <div className="mx-auto max-w-7xl px-gutter">
        <Reveal>
          <SectionHeading id="home-categories" eyebrow={t("categoriesEyebrow")} title={t("categoriesTitle")} />
        </Reveal>
        <ul className="grid auto-rows-[minmax(0,1fr)] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
          {tiles.map(({ category, image, count }, i) => {
            const Icon = getCategoryIcon(category.icon_key);
            const label = localizeCategory(category, locale);
            const big = i === 0;
            return (
              <Reveal
                as="li"
                key={category.key}
                delay={Math.min(i, 4) * 70}
                className={cn(big ? "col-span-2 aspect-[16/10] lg:row-span-2 lg:aspect-auto" : "aspect-[4/5] lg:aspect-[5/4]")}
              >
                <Link
                  href={categoryPath(category.key) as "/category/[key]"}
                  className="group relative flex h-full flex-col justify-end overflow-hidden rounded-tile bg-olive-wash p-4 shadow-card sm:p-5"
                >
                  {image ? (
                    <>
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes={big ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                        className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.05]"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-t from-[var(--tile-overlay)]/80 via-[var(--tile-overlay)]/20 to-transparent transition-opacity duration-500 group-hover:opacity-90"
                      />
                    </>
                  ) : (
                    <KufiyaNet className="absolute inset-0 text-olive opacity-15" />
                  )}
                  <span className="absolute end-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface/85 text-cream shadow-card backdrop-blur-sm transition-transform duration-500 ease-soft group-hover:-translate-y-0.5 group-hover:bg-terracotta group-hover:text-on-accent">
                    <ArrowUpRight size={18} className="rtl:-scale-x-100" />
                  </span>
                  <div className="relative">
                    <Icon size={20} strokeWidth={1.5} className={image ? "text-cream-fixed/85" : "text-olive"} />
                    <h3
                      className={cn(
                        "mt-1.5 font-playfair font-bold leading-tight",
                        big ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
                        image ? "text-cream-fixed" : "text-cream"
                      )}
                    >
                      {label}
                    </h3>
                    {count > 0 && (
                      <p className={cn("mt-1 font-inter text-xs", image ? "text-cream-fixed/80" : "text-muted")}>
                        {t("productsCount", { count })}
                      </p>
                    )}
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
