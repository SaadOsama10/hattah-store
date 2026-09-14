"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { GrainOverlay } from "@/components/ui/GrainOverlay";
import { TatreezCorner } from "@/components/ui/TatreezCorner";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { Badge } from "@/components/ui/Badge";
import { getDescendantKeys } from "@/lib/categories";
import { getCategoryIcon } from "@/lib/categoryIcons";
import {
  localizeCategory,
  localizeCategoryDescription,
  type CategoryRow,
  type Locale,
} from "@/lib/supabase/types";
import { playClick } from "@/lib/sound";

// Cycled by position rather than keyed by category, so any category an
// admin adds later (the category tree is fully admin-managed) still gets
// a consistent accent instead of falling back to nothing.
const ACCENTS = [
  { name: "forest", gradient: "from-forest/25 via-bg-secondary to-bg-secondary", hex: "#178f5e" },
  { name: "terracotta", gradient: "from-terracotta/25 via-bg-secondary to-bg-secondary", hex: "#d2572e" },
  { name: "olive", gradient: "from-olive/25 via-bg-secondary to-bg-secondary", hex: "#5b7f3f" },
  { name: "terracotta-deep", gradient: "from-terracotta-deep/25 via-bg-secondary to-bg-secondary", hex: "#d6293a" },
] as const;

export function CategoryTiles({
  categories,
  coverImages,
  productCounts,
}: {
  categories: CategoryRow[];
  /** One already-resolved image URL per top-level category key, picked
   * server-side from that category's actual products — see
   * getCategoryCoverImages. Never a manually-chosen image, and never
   * persisted anywhere: a fresh pick happens on every page load. */
  coverImages: Record<string, string>;
  productCounts: Record<string, number>;
}) {
  const t = useTranslations("categories");
  const locale = useLocale() as Locale;
  const topLevelCategories = categories.filter((c) => !c.parent_key);

  return (
    <SectionWrapper className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <div className="mb-14 text-center">
        <Badge>{t("eyebrow")}</Badge>
        <h2 className="mt-5 font-playfair text-4xl font-extrabold text-cream sm:text-5xl">
          {t("title")}
        </h2>
        <p className="mx-auto mt-4 max-w-md font-inter text-cream-secondary/70">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {topLevelCategories.map((cat, i) => {
          const Icon = getCategoryIcon(cat.icon_key);
          const label = localizeCategory(cat, locale);
          const description = localizeCategoryDescription(cat, locale) ?? t("defaultDescription");
          const accent = ACCENTS[i % ACCENTS.length];
          const coverImage = coverImages[cat.key];
          const count = getDescendantKeys(categories, cat.key).reduce(
            (sum, key) => sum + (productCounts[key] ?? 0),
            0
          );

          return (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={`/shop?category=${cat.key}`}
                onClick={() => playClick()}
                style={{ "--tile-accent": accent.hex } as React.CSSProperties}
                className={`border-gradient group relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-2xl border p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_24px_60px_-16px_color-mix(in_srgb,var(--tile-accent)_45%,transparent)] ${
                  coverImage
                    ? "border-[var(--tile-accent)]/25 bg-bg-secondary"
                    : `border-cream/10 bg-gradient-to-br ${accent.gradient}`
                }`}
              >
                {coverImage && (
                  <>
                    {/* Outer layer: a very slow, continuous "Ken Burns"
                        breathing zoom — gives the card a hint of life
                        even with no interaction. The Image's own hover
                        scale (below) stacks on top of it. */}
                    <div className="absolute inset-0 animate-kenburns">
                      <Image
                        src={coverImage}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover saturate-[0.35] sepia-[0.06] contrast-[1.05] brightness-[0.8] transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      />
                    </div>
                    {/* A single warm-neutral wash (no hue shift toward
                        the category color) — just enough to guarantee
                        the text stays legible, darkest at the bottom
                        where it sits. Identical in both themes. */}
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-[var(--tile-overlay)]/85 via-[var(--tile-overlay)]/35 to-[var(--tile-overlay)]/10"
                    />
                  </>
                )}

                <GrainOverlay opacity="opacity-[0.08]" />
                <TatreezCorner className="animate-drift absolute end-3 top-3 opacity-80" />

                <div className="relative flex items-start justify-between">
                  <span className="inline-flex items-center justify-center rounded-full bg-[var(--tile-accent)]/15 p-2.5 transition-transform duration-500 group-hover:scale-110">
                    <Icon
                      size={22}
                      strokeWidth={1.25}
                      className={`transition-transform duration-500 group-hover:rotate-6 group-hover:text-terracotta ${
                        coverImage ? "text-cream-fixed" : "text-cream"
                      }`}
                    />
                  </span>
                  <ArrowUpRight
                    size={20}
                    className={`translate-x-4 opacity-0 transition-all duration-500 ease-out group-hover:-translate-y-1 group-hover:translate-x-0 group-hover:opacity-100 rtl:-translate-x-4 rtl:group-hover:translate-x-0 ${
                      coverImage ? "text-cream-fixed/70" : "text-cream/40"
                    }`}
                  />
                </div>

                <div className="relative">
                  <h3
                    className={`relative inline-block font-playfair text-2xl font-bold ${
                      coverImage ? "text-cream-fixed drop-shadow-[0_1px_5px_rgba(0,0,0,0.5)]" : "text-cream"
                    }`}
                  >
                    {label}
                    <span
                      aria-hidden
                      className="absolute -bottom-1 start-0 h-[1.5px] w-0 bg-[var(--tile-accent)] transition-all duration-500 ease-out group-hover:w-full"
                    />
                  </h3>
                  <p
                    className={`mt-1.5 line-clamp-1 font-inter text-sm ${
                      coverImage ? "text-cream-fixed/80" : "text-cream-secondary/70"
                    }`}
                  >
                    {description}
                  </p>
                  {count > 0 && (
                    <p
                      className={`mt-2 font-inter text-xs uppercase tracking-widest ${
                        coverImage ? "text-cream-fixed/55" : "text-cream-secondary/50"
                      }`}
                    >
                      {count} {t("productCount")}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
