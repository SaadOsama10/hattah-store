"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/cn";

export const THEME_STORAGE_KEY = "hattah-theme";

type Theme = "light" | "dark";

/** Runs before first paint: the stored choice wins; on a first visit
 * (nothing stored) the device's prefers-color-scheme decides. Also
 * marks <html class="js"> so scroll-reveal CSS only hides content when
 * JS is actually running. */
export const THEME_INIT_SCRIPT = `
(function () {
  var d = document.documentElement;
  d.classList.add("js");
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    d.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Stored choice, else the device preference. */
function resolveTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // storage disabled — fall through to the device preference
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.add("js");
}

/**
 * Re-asserts the theme onto <html data-theme> on every mount: a locale
 * switch re-renders the root layout's <html> and drops attributes React
 * doesn't own, and the one-time init script can't cover that. Also
 * follows live device-theme changes while the visitor hasn't picked one.
 */
export function ThemeSync() {
  useIsomorphicLayoutEffect(() => {
    applyTheme(resolveTheme());
  });
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = () => {
      try {
        if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      } catch {}
      applyTheme(mq.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return null;
}

export function ThemeToggle({ className, labels }: { className?: string; labels?: { toLight: string; toDark: string } }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(resolveTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore (private browsing / storage disabled)
    }
  }

  const label = theme === "dark" ? (labels?.toLight ?? "Switch to light mode") : (labels?.toDark ?? "Switch to dark mode");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      suppressHydrationWarning
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full text-cream transition-colors duration-300 hover:bg-cream/8",
        className
      )}
    >
      {mounted && theme === "dark" ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
    </button>
  );
}
