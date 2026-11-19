"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export const ANNOUNCE_KEY = "hattah-announce-v2";

/** Hides the bar before first paint when it was dismissed earlier (no flash). */
export const ANNOUNCE_INIT_SCRIPT = `try{if(localStorage.getItem("${ANNOUNCE_KEY}")==="1")document.documentElement.classList.add("announce-off")}catch(e){}`;

/**
 * Thin bar above the header: three short phrases about the store,
 * cross-fading one at a time (static first phrase under reduced motion).
 * Dismissal is remembered on this device.
 */
export function AnnouncementBar({ items, closeLabel }: { items: string[]; closeLabel: string }) {
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 4200);
    return () => window.clearInterval(id);
  }, [items.length]);

  function dismiss() {
    setHidden(true);
    document.documentElement.classList.add("announce-off");
    try {
      localStorage.setItem(ANNOUNCE_KEY, "1");
    } catch {}
  }

  if (hidden || items.length === 0) return null;

  return (
    <div className="announce-bar relative bg-olive text-on-accent [html.announce-off_&]:hidden">
      <div className="relative mx-auto grid h-9 max-w-7xl place-items-center px-12 font-inter text-xs font-semibold tracking-wide">
        {items.map((item, i) => (
          <p
            key={item}
            aria-hidden={i !== index}
            className={`col-start-1 row-start-1 flex items-center gap-2.5 truncate transition-[opacity,transform] duration-700 ease-soft ${
              i === index ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1.5 opacity-0"
            }`}
          >
            <span aria-hidden className="h-1 w-1 rotate-45 bg-current opacity-70" />
            {item}
            <span aria-hidden className="h-1 w-1 rotate-45 bg-current opacity-70" />
          </p>
        ))}
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
