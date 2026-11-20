import Image from "next/image";
import { Link } from "@/i18n/navigation";

export interface TileData {
  key: string;
  label: string;
  href: string;
  /** Main photo of the category's best product. */
  image?: string;
}

/** A category: one photo and the name. Hover: the photo grows to 1.03 and
 * the name gets a thin underline. */
export function CategoryTileCard({ tile, big }: { tile: TileData; big: boolean }) {
  return (
    <Link href={tile.href as "/category/[key]"} className="group block h-full">
      <div className="relative flex h-full flex-col justify-end overflow-hidden rounded-tile bg-bg-secondary p-5 sm:p-6">
        {tile.image && (
          <>
            <Image
              src={tile.image}
              alt=""
              fill
              sizes={big ? "(min-width: 1024px) 50vw, 80vw" : "(min-width: 1024px) 25vw, 80vw"}
              className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.03]"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--tile-overlay)]/75 via-[var(--tile-overlay)]/10 to-transparent" />
          </>
        )}
        <h3
          className={`relative font-playfair font-bold leading-tight ${big ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl"} ${
            tile.image ? "text-cream-fixed" : "text-cream"
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
