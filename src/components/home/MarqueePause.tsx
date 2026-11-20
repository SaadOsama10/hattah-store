"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The strip's box (fixed height, so nothing shifts) is in the HTML from the
 * start, but its moving words are only mounted once the page is idle — the
 * strip costs nothing during the first load. While off screen its CSS
 * animation is paused (one IntersectionObserver, no per-frame work).
 */
export function MarqueePause({ srText, children }: { srText: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const go = () => setReady(true);
    let id = 0;
    const start = () => {
      id = ric ? ric(go, { timeout: 2500 }) : window.setTimeout(go, 800);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      (window as unknown as { cancelIdleCallback?: (n: number) => void }).cancelIdleCallback?.(id);
      window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-offscreen", !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="marquee">
      <p className="sr-only">{srText}</p>
      {ready && children}
    </div>
  );
}
