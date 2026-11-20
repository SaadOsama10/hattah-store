"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";

/** Thin red-thread progress bar at the very top while an in-app navigation is
 * loading: starts on a click on an internal link, finishes when the new
 * path renders. CSS-only animation; nothing shown for reduced motion
 * beyond a static bar. */
export function NavProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef(0);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // same page (anchors, filters)
      setState("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
  }, [pathname]);

  useEffect(() => {
    if (state !== "done") return;
    timer.current = window.setTimeout(() => setState("idle"), 450);
    return () => window.clearTimeout(timer.current);
  }, [state]);

  return <div aria-hidden className="nav-progress" data-state={state} />;
}
