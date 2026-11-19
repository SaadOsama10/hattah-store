import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Band } from "@/components/ui/Band";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { ParallaxY, ScrollWords } from "@/components/ui/ScrollFx";

/** Small round seal: kufiya net inside, "HATTAH · حَطّة" around the rim,
 * one green and one red arc. Rotates slowly (stops for reduced motion). */
function Seal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <clipPath id="seal-clip">
          <circle cx="100" cy="100" r="62" />
        </clipPath>
        <pattern id="seal-net" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0 H14 M0 0 V14" stroke="var(--color-gold-line)" strokeWidth="0.8" />
        </pattern>
        <path id="seal-text" d="M100 100 m-80 0 a80 80 0 1 1 160 0 a80 80 0 1 1 -160 0" />
      </defs>
      <circle cx="100" cy="100" r="96" fill="none" stroke="var(--color-gold-line)" strokeWidth="1" />
      <circle cx="100" cy="100" r="66" fill="none" stroke="var(--color-gold-line)" strokeWidth="0.8" />
      <rect x="30" y="30" width="140" height="140" fill="url(#seal-net)" clipPath="url(#seal-clip)" opacity="0.7" />
      <text fontSize="13" letterSpacing="5" fill="var(--color-gold)" fontFamily="var(--font-brand), Georgia, serif" fontWeight="700">
        <textPath href="#seal-text">HATTAH · حَطّة · HATTAH · حَطّة · HATTAH · حَطّة ·</textPath>
      </text>
      <path d="M 28 72 A 76 76 0 0 1 52 40" fill="none" stroke="var(--color-forest)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M 172 128 A 76 76 0 0 1 148 160" fill="none" stroke="var(--color-terracotta-deep)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** "Our story" on a deep band: the name's origin (the keffiyeh) — only
 * what the project brief says, no dates, figures or claims. */
export async function OurStory() {
  const t = await getTranslations("home");
  return (
    <Band tone="deep" id="our-story" labelledBy="home-story" className="cv-auto py-[calc(var(--spacing-section)*1.15)]">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-gutter lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div>
          <Reveal blur>
            <p className="mb-3 font-inter text-eyebrow font-semibold uppercase tracking-[0.24em] text-gold">{t("storyEyebrow")}</p>
            <h2 id="home-story" className="font-playfair text-h2 font-bold text-cream text-balance">
              {t("storyTitle")}
            </h2>
            <span aria-hidden className="gold-rule mt-4" />
            <p className="mt-6 max-w-xl font-inter text-base leading-loose text-cream-secondary sm:text-lg">{t("storyBody")}</p>
          </Reveal>
          <ScrollWords
            text={t("storyLine")}
            className="mt-10 font-playfair text-[clamp(1.9rem,1.2rem+3vw,3.6rem)] font-bold leading-[1.25] text-gold"
          />
          <Reveal delay={120} className="mt-10">
            <Button href="/shop" variant="primary" size="lg">
              {t("storyCta")}
              <ArrowRight size={18} className="btn-arrow rtl:-scale-x-100" />
            </Button>
          </Reveal>
        </div>

        <ParallaxY speed={0.06} className="relative mx-auto aspect-square w-full max-w-[26rem]">
          <div aria-hidden className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,var(--t-gold-glow),transparent_65%)]" />
          <svg viewBox="0 0 400 400" className="spin-slow absolute inset-0 h-full w-full opacity-60" aria-hidden>
            <circle cx="200" cy="200" r="196" fill="none" stroke="var(--color-gold-line)" strokeWidth="0.6" strokeDasharray="2 6" />
            <circle cx="200" cy="200" r="170" fill="none" stroke="var(--color-gold-line)" strokeWidth="0.4" />
          </svg>
          <div className="absolute inset-[22%] rounded-full bg-[#f6efe2] p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7),0_0_0_1px_var(--t-gold-line)]">
            <Image
              src="/images/hattah-logo-400.webp"
              alt="HATTAH — حَطّة"
              width={260}
              height={260}
              sizes="(min-width: 1024px) 230px, 55vw"
              className="h-full w-full rounded-full object-contain"
            />
          </div>
          <Seal className="spin-slow absolute bottom-[2%] end-[2%] w-[34%]" />
        </ParallaxY>
      </div>
    </Band>
  );
}
