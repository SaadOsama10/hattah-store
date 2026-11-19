import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Band } from "@/components/ui/Band";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { ParallaxY, ScrollWords } from "@/components/ui/ScrollFx";
import { Seal } from "@/components/ui/BrandArt";

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
