import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { KufiyaDivider } from "@/components/ui/KufiyaDivider";
import { KufiyaNet } from "@/components/ui/KufiyaNet";
import { Reveal } from "@/components/ui/Reveal";

/** Short, honest "who we are" block. The official round logo is shown
 * as-is (no recolouring or cropping), set on a kufiya-net panel. */
export async function AboutHattah() {
  const t = await getTranslations("home");
  return (
    <section id="our-story" aria-labelledby="home-about" className="cv-auto py-section">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-gutter lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <Reveal className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden rounded-panel bg-olive-wash lg:max-w-md">
          <KufiyaNet className="absolute inset-0 text-olive opacity-[0.16]" />
          <div className="relative rounded-full bg-bg-primary p-3 shadow-lift">
            <Image
              src="/images/hattah-logo-sm.webp"
              alt="HATTAH — حَطّة"
              width={176}
              height={176}
              className="h-36 w-36 rounded-full object-contain sm:h-44 sm:w-44"
            />
          </div>
        </Reveal>
        <Reveal delay={80}>
          <p className="mb-2 font-inter text-eyebrow font-semibold uppercase tracking-[0.18em] text-terracotta">{t("aboutEyebrow")}</p>
          <h2 id="home-about" className="font-playfair text-h2 font-bold text-cream">
            {t("aboutTitle")}
          </h2>
          <KufiyaDivider align="start" size="sm" className="mt-3" />
          <p className="mt-5 max-w-xl font-inter text-base leading-loose text-cream-secondary sm:text-lg">{t("aboutBody")}</p>
          <Link
            href="/about"
            className="group mt-6 inline-flex min-h-11 items-center gap-1.5 font-inter text-sm font-semibold text-terracotta transition-colors hover:text-cream"
          >
            {t("aboutCta")}
            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
