"use client";

import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Shirt, Gem, Lamp, Gift, Sparkles, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { GrainOverlay } from "@/components/ui/GrainOverlay";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { Badge } from "@/components/ui/Badge";
import { localizeCategory, type CategoryRow, type Locale } from "@/lib/supabase/types";
import type { CategoryKey } from "@/lib/supabase/types";
import { playClick } from "@/lib/sound";

const ICONS: Record<CategoryKey, typeof Shirt> = {
  clothing: Shirt,
  accessories: Gem,
  decor: Lamp,
  "premium-embroidery": Sparkles,
  games: Gift,
};

const GRADIENTS: Record<CategoryKey, string> = {
  clothing: "from-forest/25 via-bg-secondary to-bg-secondary",
  accessories: "from-terracotta/25 via-bg-secondary to-bg-secondary",
  decor: "from-olive/25 via-bg-secondary to-bg-secondary",
  "premium-embroidery": "from-terracotta-deep/25 via-bg-secondary to-bg-secondary",
  games: "from-forest/25 via-bg-secondary to-bg-secondary",
};

export function CategoryTiles({ categories }: { categories: CategoryRow[] }) {
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
          const descriptionKey = `${cat.key}.description`;
          const Icon = ICONS[cat.key as CategoryKey] ?? Gift;
          const label = localizeCategory(cat, locale);
          const description = t.has(descriptionKey as "clothing.description")
            ? t(descriptionKey as "clothing.description")
            : null;

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
                className={`border-gradient group relative flex h-72 flex-col justify-between overflow-hidden rounded-2xl border border-cream/10 bg-gradient-to-br p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-glow-terracotta ${GRADIENTS[cat.key as CategoryKey] ?? ""}`}
              >
                <GrainOverlay opacity="opacity-[0.05]" />
                <div className="relative flex items-start justify-between">
                  <Icon
                    size={32}
                    strokeWidth={1.25}
                    className="text-cream transition-transform duration-500 group-hover:scale-110 group-hover:text-terracotta"
                  />
                  <ArrowUpRight
                    size={20}
                    className="text-cream/40 opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 rtl:group-hover:-translate-x-1"
                  />
                </div>
                <div className="relative">
                  <h3 className="font-playfair text-2xl font-bold text-cream">{label}</h3>
                  {description && (
                    <p className="mt-2 font-inter text-sm text-cream-secondary/70">
                      {description}
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
