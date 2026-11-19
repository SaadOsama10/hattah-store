import { getLocale, getTranslations } from "next-intl/server";
import { Header, type NavCategory } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBar, ANNOUNCE_INIT_SCRIPT } from "@/components/layout/AnnouncementBar";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { NavProgress } from "@/components/layout/NavProgress";
import { BackToTop } from "@/components/layout/BackToTop";
import { MotionProvider } from "@/components/ui/MotionProvider";
import { getCachedCategories, hasActiveOffers } from "@/lib/supabase/queries";
import { localizeCategory, type Locale } from "@/lib/supabase/types";
import { categoryPath } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const [offersActive, categories, t, tCommon] = await Promise.all([
    hasActiveOffers(),
    getCachedCategories().catch(() => []),
    getTranslations("announce"),
    getTranslations("common"),
  ]);
  const navCategories: NavCategory[] = categories
    .filter((c) => !c.parent_key)
    .map((c) => ({ key: c.key, label: localizeCategory(c, locale), href: categoryPath(c.key) }));
  const announce = t.raw("items") as string[];

  return (
    <MotionProvider>
      <CartProvider>
        <AmbientBackground />
        <a
          href="#main"
          className="sr-only z-[60] rounded-full bg-terracotta px-4 py-2 font-inter text-sm font-semibold text-on-accent focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
        >
          {tCommon("skipToContent")}
        </a>
        <script dangerouslySetInnerHTML={{ __html: ANNOUNCE_INIT_SCRIPT }} />
        <NavProgress />
        <AnnouncementBar items={announce} closeLabel={t("close")} />
        <Header hasOffers={offersActive} categories={navCategories} />
        <main id="main" className="min-h-screen">
          {children}
        </main>
        <Footer categories={navCategories} hasOffers={offersActive} />
        <BackToTop label={tCommon("backToTop")} />
        <CartDrawer />
      </CartProvider>
    </MotionProvider>
  );
}
