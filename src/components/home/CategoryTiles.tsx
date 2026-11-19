import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { CategoryTileCard, type TileData } from "@/components/home/CategoryTileCard";
import { cn } from "@/lib/cn";

/** Large photo tiles for the top-level categories (bento on desktop: the
 * first tile is double size). Photos come from each category's own top
 * products and rotate — see CategoryTileCard. */
export async function CategoryTiles({ tiles }: { tiles: TileData[] }) {
  const t = await getTranslations("home");
  if (tiles.length === 0) return null;

  return (
    <section id="collection" aria-labelledby="home-categories" className="scroll-mt-20 py-section">
      <div className="mx-auto max-w-7xl px-gutter">
        <Reveal>
          <SectionHeading id="home-categories" eyebrow={t("categoriesEyebrow")} title={t("categoriesTitle")} />
        </Reveal>
        <ul className="grid auto-rows-[minmax(0,1fr)] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
          {tiles.map((tile, i) => {
            const big = i === 0;
            return (
              <Reveal
                as="li"
                key={tile.key}
                delay={Math.min(i, 5) * 90}
                className={cn(big ? "col-span-2 aspect-[16/10] lg:row-span-2 lg:aspect-auto" : "aspect-[4/5] lg:aspect-[5/4]")}
              >
                <CategoryTileCard tile={tile} big={big} order={i} />
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
