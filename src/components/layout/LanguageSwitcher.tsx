"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { Globe, Check } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, localeLabels, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export function LanguageSwitcher({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function switchLocale(nextLocale: AppLocale) {
    setOpen(false);
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex h-11 items-center gap-1.5 rounded-full px-3 font-inter text-xs font-semibold uppercase tracking-widest transition-colors duration-300",
          variant === "light"
            ? "text-cream hover:bg-cream/8"
            : "border-bg-primary/30 text-bg-primary hover:border-bg-primary hover:bg-bg-primary/5"
        )}
      >
        <Globe size={17} strokeWidth={1.75} />
        <span>{locale.toUpperCase()}</span>
      </button>

      {open && (
        <div
          className={cn(
            "absolute end-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border shadow-xl",
            "border-line bg-surface shadow-lift"
          )}
        >
          {routing.locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => switchLocale(loc)}
              className={cn(
                "flex min-h-11 w-full items-center justify-between px-4 py-2.5 text-start font-inter text-sm transition-colors duration-200 hover:bg-cream/5",
                loc === locale ? "text-terracotta" : "text-cream"
              )}
            >
              <span>{localeLabels[loc]}</span>
              {loc === locale && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
