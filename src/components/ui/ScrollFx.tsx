"use client";

import { useEffect, useRef } from "react";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Runs `onProgress(p)` (0 → 1 as the element crosses the viewport) on
 * scroll, only while the element is on screen; one rAF per frame. */
function useScrollProgress<T extends HTMLElement>(onProgress: (p: number, el: T) => void) {
  const ref = useRef<T>(null);
  const cb = useRef(onProgress);
  cb.current = onProgress;
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let frame = 0;
    let active = false;
    const run = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      cb.current(p, el);
    };
    const onScroll = () => {
      if (active && !frame) frame = requestAnimationFrame(run);
    };
    const io = new IntersectionObserver(([e]) => {
      active = e.isIntersecting;
      if (active) onScroll();
    });
    io.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}

/** A large line whose words light up one by one as it scrolls through the viewport. */
export function ScrollWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(/\s+/);
  const ref = useScrollProgress<HTMLParagraphElement>((p, el) => {
    // fully lit by the time the line is a little above the middle of the screen
    const lit = Math.min(1, Math.max(0, (p - 0.18) / 0.4)) * words.length;
    el.querySelectorAll<HTMLElement>("[data-w]").forEach((w, i) => {
      w.style.opacity = String(i < lit ? 1 : 0.18 + 0.82 * Math.max(0, lit - i));
    });
  });
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i}>
          <span data-w className="scroll-word">
            {w}
          </span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </p>
  );
}
