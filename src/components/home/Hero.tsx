import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { KufiyaDivider } from "@/components/ui/KufiyaDivider";
import { KufiyaNet } from "@/components/ui/KufiyaNet";
import { HeroCarousel, type HeroSlide } from "@/components/home/HeroCarousel";

/** Arabic diacritics (harakat, tanween, shadda, sukun, dagger alef):
 * stripped from the headline so no mark rises above the line. */
const stripTashkeel = (s: string) => s.replace(/[ً-ٰٟۖ-ۭ]/g, "");

/**
 * Full-width hero. Phones: the rotating product photo fills the width and
 * the headline sits on a warm scrim. Desktop: text on the start side, the
 * photo panel on the end side (product photos are ~900 px wide — full
 * bleed across a desktop screen would blur them). Slides come from live
 * data (the store's priciest priced products, see pickHeroProducts).
 * Entry: eyebrow → headline word by word → divider draws → text → button.
 */
export async function Hero({ slides }: { slides: HeroSlide[] }) {
  const t = await getTranslations("home");
  const words = stripTashkeel(t("heroTitle")).split(/\s+/);
  const hasPhoto = slides.length > 0;
  const step = 70;
  const afterTitle = 140 + words.length * step;

  return (
    <section className="relative overflow-hidden bg-bg-secondary">
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
        <KufiyaNet className="hero-net absolute -inset-[28px] h-[calc(100%+56px)] w-[calc(100%+56px)] text-olive opacity-[0.07]" />
      </div>
      <div className="relative mx-auto grid max-w-7xl lg:min-h-[min(80svh,780px)] lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:px-gutter lg:py-14">
        {hasPhoto && (
          <div className="relative order-first h-[min(76svh,640px)] min-h-[460px] overflow-hidden lg:order-last lg:h-[min(72svh,680px)] lg:rounded-panel lg:shadow-lift">
            <HeroCarousel slides={slides} />
          </div>
        )}

        <div
          className={
            hasPhoto
              ? "pointer-events-none absolute inset-x-0 bottom-0 z-10 px-gutter pb-9 lg:pointer-events-auto lg:static lg:px-0 lg:pb-0"
              : "px-gutter py-20 lg:px-0"
          }
        >
          <p
            className={`hero-in mb-4 inline-flex rounded-full px-3.5 py-1.5 font-inter text-xs font-semibold tracking-wide backdrop-blur-sm ${
              hasPhoto
                ? "bg-[var(--tile-overlay)]/35 text-cream-fixed lg:bg-terracotta-wash lg:text-terracotta lg:backdrop-blur-none"
                : "bg-terracotta-wash text-terracotta"
            }`}
            style={{ animationDelay: "60ms" }}
          >
            {t("heroEyebrow")}
          </p>
          {/* Generous line-height + padding so no glyph (Amiri has tall
              ascenders) can reach the eyebrow above. */}
          <h1
            className={`max-w-xl pt-1 font-playfair text-display font-bold leading-[1.3] text-balance lg:leading-[1.25] ${
              hasPhoto ? "text-cream-fixed drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] lg:text-cream lg:drop-shadow-none" : "text-cream"
            }`}
          >
            {words.map((w, i) => (
              <span key={i} className="hero-word inline-block" style={{ animationDelay: `${140 + i * step}ms` }}>
                {w}
                {i < words.length - 1 && " "}
              </span>
            ))}
          </h1>
          <div className="hero-draw mt-4 hidden lg:block" style={{ animationDelay: `${afterTitle}ms` }}>
            <KufiyaDivider align="start" />
          </div>
          <p
            className={`hero-in mt-4 max-w-lg font-inter text-base leading-relaxed sm:text-lg ${
              hasPhoto ? "text-cream-fixed/90 lg:text-cream-secondary" : "text-cream-secondary"
            }`}
            style={{ animationDelay: `${afterTitle + 120}ms` }}
          >
            {t("heroSubtitle")}
          </p>
          <div className="hero-in pointer-events-auto mt-7" style={{ animationDelay: `${afterTitle + 220}ms` }}>
            <Button href="/shop" variant="primary" size="lg" className="w-full sm:w-auto">
              {t("heroCta")}
              <ArrowRight size={18} className="btn-arrow rtl:-scale-x-100" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
