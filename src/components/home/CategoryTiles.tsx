import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { CategoryTileCard, type TileData } from "@/components/home/CategoryTileCard";
import { TilePicker } from "@/components/home/TilePicker";
import { cn } from "@/lib/cn";

/** Large photo tiles for the top-level categories (bento on desktop: the
 * first tile is double size). Each card shows one of its category's own
 * product photos, picked at random per visit (TilePicker). */
export async function CategoryTiles({ tiles }: { tiles: TileData[] }) {
  const t = await getTranslations("home");
  if (tiles.length === 0) return null;

  return (
    <section id="collection" data-stitch="" aria-labelledby="home-categories" className="scroll-mt-20 py-section">
      <div className="mx-auto max-w-7xl px-gutter">
        <Reveal>
          <SectionHeading id="home-categories" title={t("categoriesTitle")} />
        </Reveal>
        {/* phones: horizontal snap slider with a peek of the next card; desktop: asymmetric bento */}
        <ul className="scrollbar-none -mx-gutter flex snap-x snap-mandatory gap-3 overflow-x-auto px-gutter pb-2 [scroll-padding-inline:var(--spacing-gutter)] lg:mx-0 lg:grid lg:auto-rows-[minmax(0,1fr)] lg:grid-cols-4 lg:grid-rows-2 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0">
          {tiles.map((tile, i) => {
            const big = i === 0;
            return (
              <Reveal
                as="li"
                key={tile.key}
                delay={Math.min(i, 5) * 90}
                className={cn(
                  "w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-auto",
                  big ? "aspect-[4/5] lg:col-span-2 lg:row-span-2 lg:aspect-auto" : "aspect-[4/5] lg:aspect-[5/4]"
                )}
              >
                <CategoryTileCard tile={tile} big={big} />
              </Reveal>
            );
          })}
        </ul>
        {/* one random photo per card per visit, chosen before first paint */}
        <TilePicker />
      </div>
    </section>
  );
}
