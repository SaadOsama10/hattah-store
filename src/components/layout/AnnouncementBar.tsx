"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export const ANNOUNCE_KEY = "hattah-announce-v1";

/** Hides the bar before first paint when it was dismissed earlier (no flash). */
export const ANNOUNCE_INIT_SCRIPT = `try{if(localStorage.getItem("${ANNOUNCE_KEY}")==="1")document.documentElement.classList.add("announce-off")}catch(e){}`;

/**
 * Thin bar above the header with the three store facts. Desktop shows all
 * three; phones rotate them one at a time (static first item when the
 * visitor prefers reduced motion). Dismissal is remembered on this device.
 */
export function AnnouncementBar({ items, closeLabel }: { items: string[]; closeLabel: string }) {
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 3800);
    return () => window.clearInterval(id);
  }, [items.length]);

  function dismiss() {
    setHidden(true);
    document.documentElement.classList.add("announce-off");
    try {
      localStorage.setItem(ANNOUNCE_KEY, "1");
    } catch {}
  }

  if (hidden) return null;

  return (
    <div className="announce-bar relative bg-olive text-on-accent [html.announce-off_&]:hidden">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center px-12 font-inter text-xs font-semibold tracking-wide">
        {/* desktop: all items */}
        <p className="hidden items-center gap-3 sm:flex">
          {items.map((item, i) => (
            <span key={item} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden className="h-1 w-1 rotate-45 bg-current opacity-70" />}
              {item}
            </span>
          ))}
        </p>
        {/* phone: one at a time */}
        <p className="truncate sm:hidden" aria-live="off">
          <span key={index} className="inline-block animate-fade-in">
            {items[index]}
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={closeLabel}
        className="absolute end-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center opacity-80 transition-opacity hover:opacity-100"
      >
        <X size={15} />
      </button>
    </div>
  );
}
