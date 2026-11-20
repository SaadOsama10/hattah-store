"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";

/** Appears after ~1.5 screens of scrolling; sits above the product page's
 * sticky mobile order bar (--bottom-bar). */
export function BackToTop({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setShow(window.scrollY > window.innerHeight * 1.5);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      aria-label={label}
      title={label}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={cn(
        "fixed end-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-surface/90 text-cream shadow-lift ring-1 ring-line-strong backdrop-blur-md transition-[opacity,translate,box-shadow] duration-300 ease-soft ",
        "bottom-[calc(1rem+var(--bottom-bar,0px))]",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <ArrowUp size={18} />
    </button>
  );
}
