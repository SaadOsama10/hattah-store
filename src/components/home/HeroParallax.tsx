"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Very light parallax for the hero photo: drifts at ~12% of scroll
 * speed while the hero is on screen. Off for prefers-reduced-motion.
 * transform-only (no layout), driven by one rAF per scroll frame. */
export function HeroParallax({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (y > window.innerHeight * 1.2) return;
      el.style.transform = `translate3d(0, ${(y * 0.12).toFixed(1)}px, 0) scale(1.06)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 scale-[1.06] will-change-transform">
      {children}
    </div>
  );
}
