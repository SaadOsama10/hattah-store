import { Link } from "@/i18n/navigation";
import { variantPath } from "@/lib/image-variants";

export interface TileData {
  key: string;
  label: string;
  href: string;
  /** Up to 6 candidate photos from the category's own products (see tileImages). */
  images: string[];
}

const srcOf = (u: string) => variantPath(u, 960);
const srcSetOf = (u: string) => `${variantPath(u, 480)} 480w, ${variantPath(u, 960)} 960w`;

/**
 * A category: one photo and the name. The photo is picked at random on
 * each visit (see TilePicker): the HTML carries the first candidate as the
 * normal src (SEO / no-JS) and the others only as data — they are never
 * downloaded unless picked. Lazy, so the browser hasn't fetched anything
 * before the picker runs (no flash, fixed box → no layout shift).
 */
export function CategoryTileCard({ tile, big }: { tile: TileData; big: boolean }) {
  const n = tile.images.length;
  const sizes = big ? "(min-width: 1024px) 50vw, 80vw" : "(min-width: 1024px) 25vw, 80vw";
  return (
    <Link href={tile.href as "/category/[key]"} className="group block h-full">
      <div className="relative flex h-full flex-col justify-end overflow-hidden rounded-tile bg-bg-secondary p-5 sm:p-6">
        {n > 0 && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- src/srcset are swapped by TilePicker before first paint */}
            <img
              src={srcOf(tile.images[0])}
              srcSet={srcSetOf(tile.images[0])}
              sizes={sizes}
              alt=""
              loading="lazy"
              decoding="async"
              data-tile={tile.key}
              data-tile-candidates={JSON.stringify(tile.images.map((u) => [srcOf(u), srcSetOf(u)]))}
              suppressHydrationWarning
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.03]"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--tile-overlay)]/75 via-[var(--tile-overlay)]/10 to-transparent" />
          </>
        )}
        <h3
          className={`relative font-playfair font-bold leading-tight ${big ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl"} ${
            n > 0 ? "text-cream-fixed" : "text-cream"
          }`}
        >
          <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 ease-soft group-hover:bg-[length:100%_1px]">
            {tile.label}
          </span>
        </h3>
      </div>
    </Link>
  );
}
