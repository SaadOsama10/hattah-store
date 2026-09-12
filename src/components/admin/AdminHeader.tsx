"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut, ExternalLink, LayoutGrid, Tag } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { logoutAdmin } from "@/actions/auth";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/admin" as const, key: "dashboard", icon: LayoutGrid },
  { href: "/admin/categories" as const, key: "categories", icon: Tag },
];

export function AdminHeader() {
  const t = useTranslations("common");
  const tNav = useTranslations("admin.nav");
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logoutAdmin();
      router.replace("/admin/login");
      router.refresh();
    });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-cream/10 bg-bg-primary/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
        <div className="flex items-center gap-4">
          <Logo size="sm" linkToHome={false} />
          <span className="font-playfair text-lg text-cream">HATTAH Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 font-inter text-xs uppercase tracking-widest text-cream-secondary/70 transition-colors hover:text-terracotta"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">Site</span>
          </Link>
          <ThemeToggle />
          <LanguageSwitcher />
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="flex items-center gap-1.5 font-inter text-xs uppercase tracking-widest text-cream-secondary/70 transition-colors hover:text-terracotta-deep disabled:opacity-50"
          >
            <LogOut size={14} />
            {t("logout")}
          </button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl gap-6 px-5 sm:px-8">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 border-b-2 py-3 font-inter text-xs uppercase tracking-widest transition-colors",
                isActive
                  ? "border-terracotta text-cream"
                  : "border-transparent text-cream-secondary/60 hover:text-cream"
              )}
            >
              <Icon size={14} />
              {tNav(item.key)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
