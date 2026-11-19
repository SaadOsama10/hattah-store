import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { KufiyaDivider } from "@/components/ui/KufiyaDivider";
import { HeroParallax } from "@/components/home/HeroParallax";
import { KufiyaNet } from "@/components/ui/KufiyaNet";

export interface HeroPiece {
  image: string;
  alt: string;
  name: string;
  href: string;
}

/**
 * Full-width hero. Phones: the product photo fills the screen width with
 * the headline over a warm scrim. Desktop: text on the start side, the
 * photo in a large rounded panel on the end side (product photos are
 * ~900 px wide, so stretching one across a 1440 px screen would blur it).
 * The photo comes from a real product — see HERO in lib/storefront.ts.
 */
export async function Hero({ piece }: { piece: HeroPiece | null }) {
  const t = await getTranslations("home");

  return (
    <section className="relative overflow-hidden bg-bg-secondary">
      <KufiyaNet className="pointer-events-none absolute inset-0 hidden text-olive opacity-[0.07] lg:block" />
      <div className="relative mx-auto grid max-w-7xl lg:min-h-[min(78svh,760px)] lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:px-gutter lg:py-14">
        {/* Photo */}
        {piece && (
          <div className="relative order-first h-[min(72svh,620px)] min-h-[420px] overflow-hidden lg:order-last lg:h-[min(70svh,660px)] lg:rounded-panel lg:shadow-lift">
            <HeroParallax>
              <Image
                src={piece.image}
                alt={piece.alt}
                fill
                priority
                fetchPriority="high"
                sizes="(min-width: 1024px) 46vw, 100vw"
                className="object-cover"
              />
            </HeroParallax>
            {/* Phone scrim so the overlaid text stays legible on any photo. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-[var(--tile-overlay)]/90 via-[var(--tile-overlay)]/35 to-transparent lg:from-[var(--tile-overlay)]/45 lg:via-transparent"
            />
            <Link
              href={piece.href}
              className="absolute end-4 top-4 z-10 hidden max-w-[70%] items-center gap-2 rounded-full bg-surface/85 py-2 ps-4 pe-3 font-inter text-xs text-cream shadow-card ring-1 ring-line backdrop-blur-md transition-colors hover:text-terracotta lg:inline-flex"
            >
              <span className="shrink-0 font-semibold text-terracotta">{t("heroPiece")}</span>
              <span className="truncate">{piece.name}</span>
              <ArrowRight size={14} className="shrink-0 rtl:-scale-x-100" />
            </Link>
          </div>
        )}

        {/* Text — over the photo on phones, beside it on desktop */}
        <div
          className={
            piece
              ? "absolute inset-x-0 bottom-0 z-10 px-gutter pb-9 lg:static lg:px-0 lg:pb-0"
              : "px-gutter py-20 lg:px-0"
          }
        >
          <p
            className={`mb-3 inline-flex rounded-full px-3.5 py-1.5 font-inter text-xs font-semibold tracking-wide backdrop-blur-sm ${
              piece ? "bg-[var(--tile-overlay)]/35 text-cream-fixed lg:bg-terracotta-wash lg:text-terracotta lg:backdrop-blur-none" : "bg-terracotta-wash text-terracotta"
            }`}
          >
            {t("heroEyebrow")}
          </p>
          <h1
            className={`max-w-xl font-playfair text-display font-bold text-balance ${
              piece ? "text-cream-fixed drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] lg:text-cream lg:drop-shadow-none" : "text-cream"
            }`}
          >
            {t("heroTitle")}
          </h1>
          <KufiyaDivider align="start" className="mt-4 hidden lg:flex" />
          <p
            className={`mt-4 max-w-lg font-inter text-base leading-relaxed sm:text-lg ${
              piece ? "text-cream-fixed/90 lg:text-cream-secondary" : "text-cream-secondary"
            }`}
          >
            {t("heroSubtitle")}
          </p>
          <div className="mt-7">
            <Button href="/shop" variant="primary" size="lg" className="w-full sm:w-auto">
              {t("heroCta")}
              <ArrowRight size={18} className="rtl:-scale-x-100" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
