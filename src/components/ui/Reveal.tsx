"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// One shared observer for every reveal on the page (cheap, no animation library).
const callbacks = new WeakMap<Element, () => void>();
let observer: IntersectionObserver | null = null;
function getObserver() {
  if (observer || typeof IntersectionObserver === "undefined") return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        callbacks.get(e.target)?.();
        observer?.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.01 }
  );
  return observer;
}

/** Fades + lifts its content in once when scrolled into view. CSS lives in
 * globals.css (.reveal); prefers-reduced-motion shows content immediately,
 * and without JS nothing is ever hidden. */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
  blur = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
  /** blur → sharp as it appears (section headings) */
  blur?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = getObserver();
    if (!obs) {
      setVisible(true);
      return;
    }
    callbacks.set(el, () => setVisible(true));
    obs.observe(el);
    return () => {
      obs.unobserve(el);
      callbacks.delete(el);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={cn("reveal", blur && "reveal-blur", visible && "is-visible", className)}
      style={delay ? { ["--reveal-delay" as string]: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
