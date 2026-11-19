"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Menu, MessageCircle, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { CartIcon } from "@/components/cart/CartIcon";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";

export interface NavCategory {
  key: string;
  label: string;
  href: string;
}

/**
 * Sticky header: transparent at the top of the page, frosted (blur +
 * translucent background + hairline) once the page scrolls. Phones get
 * a slide-in menu from the start side; desktop gets inline links and a
 * categories dropdown. The theme toggle is visible on every screen size.
 */
export function Header({ hasOffers = false, categories = [] }: { hasOffers?: boolean; categories?: NavCategory[] }) {
  const t = useTranslations("nav");
  const tTheme = useTranslations("theme");
  const tHome = useTranslations("home");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const catsRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const links = [
    { href: "/", key: "home" },
    { href: "/shop", key: "shop" },
    ...(hasOffers ? [{ href: "/offers", key: "offers" }] : []),
    { href: "/about", key: "about" },
  ] as const;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setCatsOpen(false);
  }, [pathname]);

  // Close the desktop dropdown on outside click.
  useEffect(() => {
    if (!catsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (catsRef.current && !catsRef.current.contains(e.target as Node)) setCatsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [catsOpen]);

  // Mobile menu: lock page scroll, Esc closes, focus moves into the panel and back.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const button = menuButtonRef.current;
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [menuOpen]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const whatsappHref = buildWhatsAppOrderLink(tHome("whatsappGreeting"));
  const themeLabels = { toLight: tTheme("toLight"), toDark: tTheme("toDark") };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
          scrolled
            ? "bg-[var(--t-header-bg)] shadow-[0_1px_0_var(--t-line)] backdrop-blur-xl backdrop-saturate-150"
            : "bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:px-gutter">
          {/* phone: menu button (start) */}
          <button
            ref={menuButtonRef}
            type="button"
            className="-ms-1 flex h-11 w-11 items-center justify-center rounded-full text-cream transition-colors hover:bg-cream/8 lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label={t("menu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <Menu size={22} strokeWidth={1.75} />
          </button>

          <div className="flex flex-1 items-center lg:flex-none">
            <Logo size="sm" className="h-11 w-11" />
          </div>

          <nav aria-label={t("mainNav")} className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {links.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2.5 font-inter text-sm font-semibold transition-colors duration-200 hover:text-terracotta",
                  isActive(item.href) ? "text-terracotta" : "text-cream"
                )}
              >
                {t(item.key)}
              </Link>
            ))}
            {categories.length > 0 && (
              <div className="relative" ref={catsRef}>
                <button
                  type="button"
                  onClick={() => setCatsOpen((v) => !v)}
                  aria-expanded={catsOpen}
                  className="flex items-center gap-1 rounded-full px-4 py-2.5 font-inter text-sm font-semibold text-cream transition-colors hover:text-terracotta"
                >
                  {t("categories")}
                  <ChevronDown size={15} className={cn("transition-transform duration-200", catsOpen && "rotate-180")} />
                </button>
                {catsOpen && (
                  <ul className="absolute start-1/2 top-full z-50 mt-2 w-60 -translate-x-1/2 overflow-hidden rounded-card bg-surface p-1.5 shadow-lift ring-1 ring-line rtl:translate-x-1/2">
                    {categories.map((c) => (
                      <li key={c.key}>
                        <Link
                          href={c.href as "/category/[key]"}
                          className="flex min-h-11 items-center rounded-xl px-3.5 font-inter text-sm text-cream transition-colors hover:bg-bg-secondary hover:text-terracotta"
                        >
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </nav>

          <div className="flex items-center">
            <div className="hidden items-center lg:flex">
              <SoundToggle />
              <LanguageSwitcher />
            </div>
            <ThemeToggle labels={themeLabels} />
            <CartIcon />
          </div>
        </div>
      </header>

      {/* ── Mobile menu ── */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-[var(--tile-overlay)]/45 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMenuOpen(false)}
        aria-hidden
      />
      <div
        id="mobile-menu"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("menu")}
        inert={!menuOpen}
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-[86%] max-w-sm flex-col bg-bg-primary shadow-lift transition-transform duration-300 ease-soft lg:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-4">
          <Logo size="sm" className="h-10 w-10" />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label={t("closeMenu")}
            className="flex h-11 w-11 items-center justify-center rounded-full text-cream hover:bg-cream/8"
          >
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>

        <nav aria-label={t("mainNav")} className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="flex flex-col">
            {links.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center border-b border-line font-playfair text-xl font-bold transition-colors",
                    isActive(item.href) ? "text-terracotta" : "text-cream"
                  )}
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>

          {categories.length > 0 && (
            <>
              <p className="mb-1 mt-6 font-inter text-eyebrow font-semibold uppercase tracking-[0.16em] text-muted">{t("categories")}</p>
              <ul className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <li key={c.key}>
                    <Link
                      href={c.href as "/category/[key]"}
                      className="inline-flex min-h-11 items-center rounded-full bg-bg-secondary px-4 font-inter text-sm text-cream ring-1 ring-line transition-colors hover:text-terracotta"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <div className="space-y-4 border-t border-line p-4">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest font-inter text-sm font-semibold text-on-accent"
          >
            <MessageCircle size={18} />
            {tHome("ctaButton")}
          </a>
          <div className="flex items-center justify-between">
            <LanguageSwitcher placement="up" />
            <div className="flex items-center">
              <SoundToggle />
              <ThemeToggle labels={themeLabels} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
