"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ImageOff, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Product gallery: a swipeable main image (native scroll-snap — smooth on
 * phones, no gesture library), thumbnails, arrow buttons on desktop, and
 * a full-screen zoom (lightbox) with swipe, arrows, ← → keys and Esc.
 * Alt text: the first image uses `alt`, the others "alt - 2", "alt - 3" …
 */
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const t = useTranslations("product");
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  // Desktop hover-zoom: the photo magnifies toward the cursor.
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
  const fineRef = useRef<boolean | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const zoomTrackRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const n = images.length;
  const altFor = (i: number) => (i > 0 ? `${alt} - ${i + 1}` : alt);

  const scrollTo = useCallback((track: HTMLDivElement | null, i: number, smooth = true) => {
    if (!track) return;
    const slide = track.children[i] as HTMLElement | undefined;
    if (!slide) return;
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const go = useCallback(
    (i: number) => {
      const next = (i + n) % n;
      setIndex(next);
      scrollTo(trackRef.current, next);
      scrollTo(zoomTrackRef.current, next);
    },
    [n, scrollTo]
  );

  // Keep `index` in sync with swipes.
  const onScroll = (track: HTMLDivElement | null) => {
    if (!track) return;
    const w = track.clientWidth;
    if (!w) return;
    const i = Math.round(Math.abs(track.scrollLeft) / w);
    if (i !== index && i >= 0 && i < n) setIndex(i);
  };

  useEffect(() => {
    if (!zoom) return;
    scrollTo(zoomTrackRef.current, index, false);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const rtl = document.documentElement.dir === "rtl";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") go(index + (rtl ? -1 : 1));
      if (e.key === "ArrowLeft") go(index + (rtl ? 1 : -1));
    };
    document.addEventListener("keydown", onKey);
    const opener = openerRef.current;
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
    // index intentionally included so arrow keys use the current slide
  }, [zoom, index, go, scrollTo]);

  if (n === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-panel bg-surface text-muted ring-1 ring-line">
        <ImageOff size={44} strokeWidth={1.25} />
      </div>
    );
  }

  const arrowCls =
    "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-cream shadow-card ring-1 ring-line backdrop-blur-sm transition-colors hover:text-terracotta sm:flex";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-panel bg-surface ring-1 ring-line">
        <div
          ref={trackRef}
          onScroll={() => onScroll(trackRef.current)}
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          aria-roledescription="carousel"
          aria-label={t("gallery")}
        >
          {images.map((src, i) => (
            <div
              key={src + i}
              className="relative aspect-[4/5] w-full shrink-0 snap-center"
              role="group"
              aria-roledescription="slide"
              aria-label={t("imageOf", { n: i + 1, total: n })}
            >
              <div
                className="absolute inset-0 cursor-zoom-in overflow-hidden"
                onClick={() => setZoom(true)}
                onPointerMove={(e) => {
                  if (fineRef.current === null) fineRef.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
                  if (e.pointerType !== "mouse" || !fineRef.current || i !== index) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  setLens({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
                }}
                onPointerLeave={() => setLens(null)}
              >
                <Image
                  src={src}
                  alt={altFor(i)}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  priority={i === 0}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  className="select-none object-contain transition-transform duration-300 ease-out motion-reduce:transition-none"
                  style={
                    lens && i === index
                      ? { transform: "scale(1.9)", transformOrigin: `${lens.x}% ${lens.y}%` }
                      : undefined
                  }
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          ref={openerRef}
          type="button"
          onClick={() => setZoom(true)}
          aria-label={t("zoom")}
          className="absolute end-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-cream shadow-card ring-1 ring-line backdrop-blur-sm transition-colors hover:text-terracotta"
        >
          <Maximize2 size={18} />
        </button>

        {n > 1 && (
          <>
            <button type="button" onClick={() => go(index - 1)} aria-label={t("prevImage")} className={cn(arrowCls, "start-3")}>
              <ChevronLeft size={20} className="rtl:-scale-x-100" />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label={t("nextImage")} className={cn(arrowCls, "end-3")}>
              <ChevronRight size={20} className="rtl:-scale-x-100" />
            </button>
            {/* dots (phones) */}
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden" aria-hidden>
              {images.map((_, i) => (
                <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-terracotta" : "w-1.5 bg-cream/35")} />
              ))}
            </div>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="scrollbar-none flex gap-2.5 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => go(i)}
              aria-label={t("imageOf", { n: i + 1, total: n })}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "relative h-[72px] w-[60px] shrink-0 overflow-hidden rounded-xl bg-surface ring-2 transition-all duration-300 sm:h-20 sm:w-16",
                i === index ? "ring-terracotta" : "opacity-70 ring-transparent hover:opacity-100"
              )}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {zoom && (
        <div role="dialog" aria-modal="true" aria-label={t("gallery")} className="fixed inset-0 z-[70] flex flex-col bg-[var(--tile-overlay)]/95 backdrop-blur-sm">
          <div className="flex h-16 items-center justify-between px-3 text-cream-fixed">
            <p className="px-2 font-inter text-sm" aria-live="polite">
              {t("imageOf", { n: index + 1, total: n })}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setZoom(false)}
              aria-label={t("closeZoom")}
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
            >
              <X size={24} />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <div
              ref={zoomTrackRef}
              onScroll={() => onScroll(zoomTrackRef.current)}
              className="scrollbar-none flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
            >
              {images.map((src, i) => (
                <div key={src + i} className="relative h-full w-full shrink-0 snap-center">
                  <Image src={src} alt={altFor(i)} fill sizes="100vw" className="object-contain" draggable={false} />
                </div>
              ))}
            </div>
            {n > 1 && (
              <>
                <button type="button" onClick={() => go(index - 1)} aria-label={t("prevImage")} className={cn(arrowCls, "start-4 !flex")}>
                  <ChevronLeft size={20} className="rtl:-scale-x-100" />
                </button>
                <button type="button" onClick={() => go(index + 1)} aria-label={t("nextImage")} className={cn(arrowCls, "end-4 !flex")}>
                  <ChevronRight size={20} className="rtl:-scale-x-100" />
                </button>
              </>
            )}
          </div>
          <div className="h-6" />
        </div>
      )}
    </div>
  );
}
