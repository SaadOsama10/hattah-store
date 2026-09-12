"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/cn";

export const THEME_STORAGE_KEY = "hattah-theme";

export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var theme = stored === "light" || stored === "dark" ? stored : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

// Layout effects don't run during SSR (and warn if used carelessly there);
// this resolves to the right hook per environment once per module load,
// which doesn't violate the rules of hooks.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** localStorage — never the `data-theme` DOM attribute — is the single
 * source of truth. The attribute is only ever a projection of this value
 * onto the DOM; anything reading "the current theme" should read this. */
function getStoredTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Re-asserts the stored theme onto <html data-theme> on every mount.
 *
 * Why this exists: switching locale is a client-side navigation (no full
 * page reload), but it re-renders the root [locale] layout — including
 * the <html> element itself — which wipes any attribute set imperatively
 * (like data-theme) since React only manages the props it's explicitly
 * given (lang/dir), not ad-hoc attributes. The one-time inline
 * THEME_INIT_SCRIPT only runs on a genuine first page load, so nothing
 * re-applies data-theme after that reset. Mounting this alongside the
 * init script means its layout effect re-fires on every such re-render,
 * restoring the theme before the browser paints — no flash, no drift
 * between locale switches.
 */
export function ThemeSync() {
  useIsomorphicLayoutEffect(() => {
    applyTheme(getStoredTheme());
  });
  return null;
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getStoredTheme());
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

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      suppressHydrationWarning
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border border-cream/25 text-cream transition-all duration-300 hover:scale-105 hover:border-cream hover:bg-cream/5",
        className
      )}
    >
      {!mounted ? (
        <Moon size={15} />
      ) : theme === "dark" ? (
        <Sun size={15} />
      ) : (
        <Moon size={15} />
      )}
    </button>
  );
}
