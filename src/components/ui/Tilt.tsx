"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Light 3D tilt (max ~5°) with a soft sheen that follows the pointer.
 * Mouse/pen only — touch and keyboard users get the plain element; off
 * under prefers-reduced-motion (CSS in globals.css). transform-only.
 *
 * `useTilt` lets the pointer be tracked on a bigger area (e.g. a whole
 * card whose stretched link covers the photo) while the tilt is applied
 * to the element carrying `tiltRef` (which needs the `tilt` class and a
 * `<span className="tilt-sheen" />` child).
 */
export function useTilt(max = 5) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  function onPointerMove(e: React.PointerEvent) {
    if (e.pointerType === "touch") return;
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.classList.add("is-tilting");
      el.style.setProperty("--ry", `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty("--sx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--sy", `${(y * 100).toFixed(1)}%`);
    });
  }

  function onPointerLeave() {
    const el = tiltRef.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.classList.remove("is-tilting");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return { tiltRef, handlers: { onPointerMove, onPointerLeave } };
}

export function Tilt({ children, className, max = 5 }: { children: ReactNode; className?: string; max?: number }) {
  const { tiltRef, handlers } = useTilt(max);
  return (
    <div ref={tiltRef} {...handlers} className={cn("tilt relative", className)}>
      {children}
      <span aria-hidden className="tilt-sheen" />
    </div>
  );
}
