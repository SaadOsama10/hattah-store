"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { KufiyaNet } from "@/components/ui/KufiyaNet";
import { useTilt } from "@/components/ui/Tilt";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/cn";

export interface TileData {
  key: string;
  label: string;
  href: string;
  iconKey: string;
  /** Main photos of the category's top products (up to 3), best first. */
  images: string[];
  /** Real number of products in the category (incl. subcategories). */
  count: number;
  countLabel: string;
}

const PERIOD = 5200;

/** One category tile. Its photo cross-fades between the category's top
 * products every few seconds (tiles are offset so they don't all change
 * at once); only while on screen, never under reduced motion. Extra
 * photos are requested only when their turn comes. */
export function CategoryTileCard({ tile, big, order }: { tile: TileData; big: boolean; order: number }) {
  const Icon = getCategoryIcon(tile.iconKey);
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0]));
  const rootRef = useRef<HTMLAnchorElement>(null);
  const { tiltRef, handlers } = useTilt(4);
  const n = tile.images.length;

  useEffect(() => {
    const el = rootRef.current;
    if (!el || n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer = 0;
    let visible = false;
    const tick = () => {
      setIndex((i) => {
        const next = (i + 1) % n;
        setMounted((m) => (m.has(next) ? m : new Set(m).add(next)));
        return next;
      });
    };
    const start = () => {
      if (timer) return;
      // stagger the first change per tile
      timer = window.setTimeout(function loop() {
        tick();
        timer = window.setTimeout(loop, PERIOD);
      }, PERIOD + order * 900);
    };
    const stop = () => {
      window.clearTimeout(timer);
      timer = 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
    };
  }, [n, order]);

  // Warm the next photo a moment before it shows.
  useEffect(() => {
    if (n < 2) return;
    const id = window.setTimeout(() => {
      const next = (index + 1) % n;
      setMounted((m) => (m.has(next) ? m : new Set(m).add(next)));
    }, PERIOD - 1500);
    return () => window.clearTimeout(id);
  }, [index, n]);

  const hasImage = n > 0;

  return (
    <Link
      ref={rootRef}
      href={tile.href as "/category/[key]"}
      {...handlers}
      className="group block h-full"
    >
      <div
        ref={tiltRef}
        className="tilt relative flex h-full flex-col justify-end overflow-hidden rounded-tile bg-olive-wash p-4 shadow-card sm:p-5"
      >
        {hasImage ? (
          <>
            {tile.images.map((src, i) =>
              mounted.has(i) ? (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  fill
                  sizes={big ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                  className={cn(
                    "object-cover transition-[opacity,transform] duration-[1400ms] ease-soft group-hover:scale-[1.06]",
                    i === index ? "opacity-100" : "opacity-0"
                  )}
                />
              ) : null
            )}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[var(--tile-overlay)]/85 via-[var(--tile-overlay)]/25 to-transparent"
            />
          </>
        ) : (
          <KufiyaNet className="absolute inset-0 text-olive opacity-15" />
        )}
        <span aria-hidden className="gold-corners" />
        <span className="absolute end-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface/85 text-cream shadow-card backdrop-blur-sm transition-[transform,background-color,color] duration-500 ease-soft group-hover:-translate-y-0.5 group-hover:bg-terracotta group-hover:text-on-accent">
          <ArrowUpRight size={18} className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
        </span>
        <div className="relative">
          <Icon size={20} strokeWidth={1.5} className={hasImage ? "text-cream-fixed/85" : "text-olive"} />
          <h3
            className={cn(
              "mt-1.5 font-playfair font-bold leading-tight",
              big ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
              hasImage ? "text-cream-fixed" : "text-cream"
            )}
          >
            {tile.label}
          </h3>
          {tile.count > 0 && (
            <p className={cn("mt-1 font-inter text-xs tracking-wide", hasImage ? "text-cream-fixed/80" : "text-muted")}>{tile.countLabel}</p>
          )}
        </div>
        <span aria-hidden className="tilt-sheen" />
      </div>
    </Link>
  );
}
