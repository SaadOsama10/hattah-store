"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { ImageOff, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  // Adapts the frame to each image's real proportions instead of forcing a
  // fixed square — starts at 1 (square) until the current image's actual
  // dimensions are known, then keeps the previous ratio during a switch
  // rather than flashing back to square while the next one loads.
  const [ratio, setRatio] = useState(1);
  const hasImages = images.length > 0;

  function go(delta: number) {
    if (!hasImages) return;
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const threshold = 60;
    const isRtl = document.documentElement.dir === "rtl";
    if (info.offset.x < -threshold) go(isRtl ? -1 : 1);
    else if (info.offset.x > threshold) go(isRtl ? 1 : -1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="relative w-full max-h-[75vh] overflow-hidden rounded-2xl bg-bg-secondary transition-[aspect-ratio] duration-300"
        style={{ aspectRatio: ratio }}
      >
        {hasImages ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={index}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
            >
              <Image
                src={images[index]}
                alt={alt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="pointer-events-none select-none object-contain"
                priority
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setRatio(img.naturalWidth / img.naturalHeight);
                  }
                }}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-cream/20">
            <ImageOff size={48} />
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute start-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-bg-primary/60 text-cream backdrop-blur-sm transition-colors hover:bg-bg-primary/90"
            >
              <ChevronLeft size={18} className="rtl:-scale-x-100" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute end-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-bg-primary/60 text-cream backdrop-blur-sm transition-colors hover:bg-bg-primary/90"
            >
              <ChevronRight size={18} className="rtl:-scale-x-100" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-colors duration-300",
                i === index ? "border-terracotta" : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <Image src={img} alt={`${alt} ${i + 1}`} fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
