"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { CartIcon } from "@/components/cart/CartIcon";
import { cn } from "@/lib/cn";

const BASE_NAV_ITEMS = [
  { href: "/" as const, key: "home" },
  { href: "/shop" as const, key: "shop" },
  { href: "/#our-story" as const, key: "about" },
];

const OFFERS_NAV_ITEM = { href: "/offers" as const, key: "offers" };

export function Header({ hasOffers = false }: { hasOffers?: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Only a real, currently-active sale makes this link worth showing —
  // no point linking to an offers page that would just render empty.
  const NAV_ITEMS = hasOffers
    ? [...BASE_NAV_ITEMS.slice(0, 2), OFFERS_NAV_ITEM, ...BASE_NAV_ITEMS.slice(2)]
    : BASE_NAV_ITEMS;

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-500",
        scrolled || mobileOpen
          ? "bg-bg-primary/90 backdrop-blur-md shadow-lg shadow-black/20"
          : "bg-gradient-to-b from-bg-primary/70 to-transparent"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
        <Logo size="sm" />

        <nav className="hidden items-center gap-10 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="font-inter text-xs uppercase tracking-[0.2em] text-cream-secondary transition-colors duration-300 hover:text-terracotta"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <CartIcon />
          <SoundToggle />
          <ThemeToggle />
          <LanguageSwitcher />
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <CartIcon />
          <button
            type="button"
            className="flex items-center justify-center text-cream"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-cream/10 bg-bg-primary/98 px-5 pb-8 pt-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="border-b border-cream/5 py-4 font-playfair text-lg text-cream transition-colors duration-300 hover:text-terracotta"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <div className="mt-6 flex items-center gap-2.5">
            <SoundToggle />
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
