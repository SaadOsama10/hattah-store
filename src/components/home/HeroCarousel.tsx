"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export interface HeroSlide {
  id: string;
  image: string;
  alt: string;
  name: string;
  href: string;
}

const INTERVAL = 6000;

/**
 * The hero photo panel: cross-fades (with a slow Ken Burns zoom) between
 * the store's premium products, chosen on the server from live data.
 * Dots double as progress bars; prev/next buttons; swipe on phones;
 * pauses on hover, on keyboard focus, when the tab is hidden, or via
 * the pause button. Light parallax on scroll and (desktop) mouse move.
 * Reduced motion: no autoplay, no zoom, no parallax.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const n = slides.length;
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [hiddenTab, setHiddenTab] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  // Only the visible slide and the next one are ever requested.
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));
  const rootRef = useRef<HTMLDivElement>(null);
  const moveRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  const paused = hovered || userPaused || hiddenTab || reduced;

  const go = useCallback((i: number) => setIndex(((i % n) + n) % n), [n]);

  useEffect(() => {
    setMounted(true);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const onVis = () => setHiddenTab(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Preload the next slide once the current one is shown.
  useEffect(() => {
    if (!mounted) return;
    setLoaded((prev) => {
      const next = new Set(prev);
      next.add(index);
      next.add((index + 1) % n);
      return next.size === prev.size ? prev : next;
    });
  }, [index, n, mounted]);

  // Autoplay (restarts its timer on every slide change).
  useEffect(() => {
    if (paused || n < 2) return;
    const id = window.setTimeout(() => go(index + 1), INTERVAL);
    return () => window.clearTimeout(id);
  }, [index, paused, n, go]);

  // Parallax: scroll drift + mouse tilt (desktop), transform only, one rAF per frame.
  useEffect(() => {
    const el = moveRef.current;
    const root = rootRef.current;
    if (!el || !root || reduced) return;
    let sy = 0;
    let mx = 0;
    let my = 0;
    let frame = 0;
    const apply = () => {
      frame = 0;
      el.style.transform = `translate3d(${(mx * -12).toFixed(1)}px, ${(sy * 0.1 + my * -10).toFixed(1)}px, 0)`;
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onScroll = () => {
      const y = window.scrollY;
      if (y > window.innerHeight * 1.3) return;
      sy = y;
      queue();
    };
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
      queue();
    };
    const onLeave = () => {
      mx = 0;
      my = 0;
      queue();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    if (fine) {
      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerleave", onLeave);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  if (n === 0) return null;
  const current = slides[index];
  const rtl = () => typeof document !== "undefined" && document.documentElement.dir === "rtl";

  return (
    <div
      ref={rootRef}
      className="group/hero absolute inset-0"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) < 40) return;
        // Swiping toward the reading direction's start shows the next piece.
        const forward = rtl() ? dx > 0 : dx < 0;
        go(index + (forward ? 1 : -1));
      }}
      aria-roledescription="carousel"
      aria-label={t("heroPiece")}
    >
      {/* Slides */}
      <div ref={moveRef} className="absolute -inset-4 will-change-transform">
        {slides.map((s, i) => (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={t("heroSlide", { n: i + 1, total: n })}
            aria-hidden={i !== index}
            className={cn("hero-slide absolute inset-0", i === index && "is-on", mounted && !reduced && i === index && "kb")}
          >
            {loaded.has(i) && (
              <Image
                src={s.image}
                alt={s.alt}
                fill
                priority={i === 0}
                fetchPriority={i === 0 ? "high" : "auto"}
                sizes="(min-width: 1024px) 46vw, 100vw"
                className="object-cover"
              />
            )}
          </div>
        ))}
      </div>

      {/* Scrim (phones: the headline sits on the photo) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--tile-overlay)]/90 via-[var(--tile-overlay)]/40 to-[var(--tile-overlay)]/25 md:via-[var(--tile-overlay)]/55 lg:from-[var(--tile-overlay)]/55 lg:via-transparent lg:to-transparent"
      />

      {/* "From the store › name" chip — follows the current slide */}
      <Link
        key={current.id}
        href={current.href}
        className="hero-chip absolute end-3 top-3 z-10 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full bg-surface/90 py-2 ps-3.5 pe-2.5 font-inter text-xs text-cream shadow-card ring-1 ring-line backdrop-blur-md transition-colors hover:text-terracotta lg:end-4 lg:top-4 lg:max-w-[75%]"
      >
        <span className="shrink-0 font-semibold text-terracotta">{t("heroPiece")}</span>
        <ChevronLeft size={13} className="shrink-0 text-muted ltr:rotate-180" aria-hidden />
        <span className="truncate">{current.name}</span>
        <ArrowRight size={14} className="shrink-0 rtl:-scale-x-100" aria-hidden />
      </Link>

      {/* Controls */}
      {n > 1 && (
        <div className="absolute inset-x-3 top-14 z-10 flex items-center justify-end gap-1 lg:inset-x-4 lg:bottom-4 lg:top-auto lg:justify-between">
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--tile-overlay)]/35 px-2.5 py-2 backdrop-blur-sm">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={t("heroSlide", { n: i + 1, total: n })}
                aria-current={i === index ? "true" : undefined}
                className="relative flex h-6 items-center"
              >
                <span
                  className={cn(
                    "relative block h-1.5 overflow-hidden rounded-full bg-white/40 transition-[width] duration-500 ease-soft",
                    i === index ? "w-8" : "w-1.5"
                  )}
                >
                  {i === index && (
                    <span
                      key={`${index}-${paused}`}
                      className="hero-progress absolute inset-y-0 start-0 block rounded-full bg-white"
                      style={{ animationDuration: `${INTERVAL}ms`, animationPlayState: paused ? "paused" : "running" }}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setUserPaused((v) => !v)}
              aria-label={userPaused ? t("heroPlay") : t("heroPause")}
              className="hidden h-11 w-11 items-center lg:flex justify-center rounded-full bg-surface/90 text-cream shadow-card ring-1 ring-line backdrop-blur-sm transition-colors hover:text-terracotta"
            >
              {userPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label={tCommon("previous")}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-cream shadow-card ring-1 ring-line backdrop-blur-sm transition-colors hover:text-terracotta"
            >
              <ChevronLeft size={20} className="rtl:-scale-x-100" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label={tCommon("next")}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-cream shadow-card ring-1 ring-line backdrop-blur-sm transition-colors hover:text-terracotta"
            >
              <ChevronRight size={20} className="rtl:-scale-x-100" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
