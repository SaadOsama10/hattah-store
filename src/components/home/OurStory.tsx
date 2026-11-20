import { getTranslations } from "next-intl/server";
import { Band } from "@/components/ui/Band";
import { Reveal } from "@/components/ui/Reveal";
import { TextLink } from "@/components/ui/SectionHeading";
import { ScrollWords } from "@/components/ui/ScrollFx";

/** "Our story" — a plain dark band, one large line that lights up word by
 * word as it scrolls, a short paragraph and a link. Nothing else. */
export async function OurStory() {
  const t = await getTranslations("home");
  return (
    <Band tone="deep" id="our-story" labelledBy="home-story" className="cv-auto py-[calc(var(--spacing-section)*1.2)]">
      <div className="mx-auto max-w-4xl px-gutter text-center">
        <Reveal>
          <h2 id="home-story" className="font-inter text-sm font-semibold uppercase tracking-[0.2em] text-cream-secondary">
            {t("storyTitle")}
          </h2>
        </Reveal>
        <ScrollWords
          text={t("storyLine")}
          className="mx-auto mt-8 max-w-3xl font-playfair text-[clamp(2.2rem,1.3rem+4vw,4.6rem)] font-bold leading-[1.2] text-cream text-balance"
        />
        <Reveal className="mx-auto mt-10 max-w-2xl">
          <p className="font-inter text-base leading-loose text-cream-secondary sm:text-lg">{t("storyBody")}</p>
          <TextLink href="/about" className="mt-8">
            {t("aboutCta")}
          </TextLink>
        </Reveal>
      </div>
    </Band>
  );
}
