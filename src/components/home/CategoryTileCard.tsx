"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

export interface TileData {
  key: string;
  label: string;
  href: string;
  /** Main photos of up to 4 of the category's products (see tileImages). */
  images: string[];
}

const PERIOD = 5500;
const STAGGER = 800;

/**
 * A category: its photos cross-fade (opacity only) between up to four of
 * the category's own products, and the name. The first photo is in the
 * server HTML; the others are mounted after the page is idle and load
 * through the 480/960 variants. Rotation pauses off screen, in a hidden
 * tab and while the card is hovered; cards are staggered by 0.8 s so they
 * never change together. Reduced motion: no rotation, a random starting
 * photo per visit. One photo only: it stays still.
 */
export function CategoryTileCard({ tile, big, order = 0 }: { tile: TileData; big: boolean; order?: number }) {
  const n = tile.images.length;
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0]));
  const ref = useRef<HTMLAnchorElement>(null);
  const hovered = useRef(false);

  useEffect(() => {
    if (n < 2) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const start = Math.floor(Math.random() * n);
      setMounted(new Set([0, start]));
      setIndex(start);
      return;
    }

    // the other photos: only once the page is idle
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const mountAll = () => setMounted(new Set(tile.images.map((_, i) => i)));
    const idle = ric ? ric(mountAll, { timeout: 3000 }) : window.setTimeout(mountAll, 1200);

    const el = ref.current;
    let visible = false;
    let timer = 0;
    const running = () => visible && !hovered.current && document.visibilityState === "visible";
    const tick = () => {
      if (running()) setIndex((i) => (i + 1) % n);
      timer = window.setTimeout(tick, PERIOD);
    };
    timer = window.setTimeout(tick, PERIOD + order * STAGGER);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (el) io.observe(el);

    return () => {
      window.clearTimeout(timer);
      io.disconnect();
      (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(idle);
      window.clearTimeout(idle);
    };
  }, [n, order, tile.images]);

  const sizes = big ? "(min-width: 1024px) 50vw, 80vw" : "(min-width: 1024px) 25vw, 80vw";

  return (
    <Link
      ref={ref}
      href={tile.href as "/category/[key]"}
      className="group block h-full"
      onPointerEnter={() => (hovered.current = true)}
      onPointerLeave={() => (hovered.current = false)}
    >
      <div className="relative flex h-full flex-col justify-end overflow-hidden rounded-tile bg-bg-secondary p-5 sm:p-6">
        {n > 0 && (
          <>
            {tile.images.map((src, i) =>
              mounted.has(i) ? (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  fill
                  sizes={sizes}
                  className={`object-cover transition-[opacity,transform] duration-[1200ms] ease-soft group-hover:scale-[1.03] ${
                    i === index ? "opacity-100" : "opacity-0"
                  }`}
                />
              ) : null
            )}
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
