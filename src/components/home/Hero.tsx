import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowDown, MessageCircle } from "lucide-react";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";
import { HeroFx, HeroPhrases, HERO_SEEN_SCRIPT } from "@/components/home/HeroFx";
import { KufiyaNetDraw, LogoRing } from "@/components/ui/BrandArt";

/** Arabic diacritics (harakat, tanween, shadda, sukun, dagger alef) — the
 * headline is always rendered without them. */
const stripTashkeel = (s: string) => s.replace(/[ً-ٰٟۖ-ۭ]/g, "");

/**
 * Brand hero — no products: the logo, the kufiya, warm light and words.
 * Everything visible is server-rendered HTML/SVG/CSS (the headline is the
 * LCP element and paints with the HTML); the canvas particles, parallax,
 * phrase rotation and pause button are a small client add-on (HeroFx)
 * started after load. Entry sequence ≈3.2 s, once per session
 * (sessionStorage); prefers-reduced-motion shows the final state.
 */
export async function Hero() {
  const t = await getTranslations("hero");
  const tHome = await getTranslations("home");
  const words = stripTashkeel(t("title")).split(/\s+/);
  const phrases = t.raw("phrases") as string[];
  const letters = "HATTAH".split("");
  const whatsappHref = buildWhatsAppOrderLink(tHome("whatsappGreeting"));

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: HERO_SEEN_SCRIPT }} />
      <section id="brand-hero" className="bh" aria-labelledby="bh-title">
        {/* 1. glow */}
        <div className="bh-layer bh-glow-wrap bh-e" aria-hidden>
          <div className="bh-glow" />
        </div>
        {/* 3. light rays (behind the net so the net reads on top) */}
        <div className="bh-layer bh-rays-wrap" aria-hidden>
          <div className="bh-rays" />
        </div>
        {/* 2. kufiya net */}
        <KufiyaNetDraw />
        {/* 4. particles (client canvas), 5. grain, 6. vignette */}
        <HeroFx
          labels={{ pause: t("pause"), play: t("play") }}
        />
        <div className="bh-layer bh-grain" aria-hidden />
        <div className="bh-layer bh-vignette" aria-hidden />

        <div className="bh-content">
          <p className="bh-badge bh-e">
            <span aria-hidden className="bh-badge-line" />
            {t("badge")}
            <span aria-hidden className="bh-badge-line" />
          </p>

          <div className="bh-logo-wrap bh-e">
            <div className="bh-halo" aria-hidden />
            <LogoRing />
            {/* Official round logo — shown exactly as supplied (a 400 px resize of
                public/images/hattah-logo.jpg for sharp rendering), never altered. */}
            <Image
              src="/images/hattah-logo-400.webp"
              alt="HATTAH — حَطّة"
              width={180}
              height={180}
              priority
              className="bh-logo"
            />
          </div>

          <p className="bh-word" dir="ltr">
            <span className="sr-only">HATTAH</span>
            <span aria-hidden className="bh-letters">
              {letters.map((l, i) => (
                <span key={i} className="bh-letter bh-e" style={{ animationDelay: `${1400 + i * 80}ms` }}>
                  {l}
                </span>
              ))}
            </span>
            <span aria-hidden className="bh-word-shine bh-e">
              HATTAH
            </span>
          </p>

          <h1 id="bh-title" className="bh-title font-playfair">
            {words.map((w, i) => (
              <span key={i}>
                <span className="bh-wordin bh-e" style={{ animationDelay: `${1900 + i * 120}ms` }}>
                  {w}
                </span>
                {i < words.length - 1 && " "}
              </span>
            ))}
          </h1>

          <HeroPhrases phrases={phrases} labelFor={phrases.map((_, i) => t("phrase", { n: i + 1, total: phrases.length }))} />

          <div className="bh-ctas bh-e">
            <a href="#collection" className="bh-btn bh-btn-primary">
              <span>{t("ctaPrimary")}</span>
              <ArrowDown size={18} aria-hidden />
            </a>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="bh-btn bh-btn-ghost">
              <MessageCircle size={18} aria-hidden />
              <span>{t("ctaSecondary")}</span>
            </a>
          </div>
        </div>

        <a href="#collection" className="bh-scroll bh-e" aria-label={t("scroll")}>
          <span className="bh-scroll-line">
            <span className="bh-scroll-dot" />
          </span>
        </a>
      </section>
    </>
  );
}
