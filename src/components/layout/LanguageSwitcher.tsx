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
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3.5 py-2 font-inter text-xs uppercase tracking-widest transition-all duration-300 hover:scale-105",
          variant === "light"
            ? "border-cream/25 text-cream hover:border-cream hover:bg-cream/5"
            : "border-bg-primary/30 text-bg-primary hover:border-bg-primary hover:bg-bg-primary/5"
        )}
      >
        <Globe size={14} />
        <span>{locale.toUpperCase()}</span>
      </button>

      {open && (
        <div
          className={cn(
            "absolute end-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border shadow-xl",
            "border-cream/15 bg-bg-secondary"
          )}
        >
          {routing.locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => switchLocale(loc)}
              className={cn(
                "flex w-full items-center justify-between px-4 py-2.5 text-start font-inter text-sm transition-colors duration-200 hover:bg-cream/5",
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
