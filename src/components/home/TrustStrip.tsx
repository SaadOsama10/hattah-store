import { getTranslations } from "next-intl/server";
import { Landmark, Gem, MessageCircle, HandHeart } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

/** Four short statements about the store with thin line icons — no
 * delivery terms, ratings, counts, cities or promises. */
export async function TrustStrip() {
  const t = await getTranslations("home");
  const items = [
    { Icon: Landmark, title: t("trustHeritage"), sub: t("trustHeritageSub") },
    { Icon: Gem, title: t("trustCurated"), sub: t("trustCuratedSub") },
    { Icon: MessageCircle, title: t("trustWhatsapp"), sub: t("trustWhatsappSub") },
    { Icon: HandHeart, title: t("trustAuthentic"), sub: t("trustAuthenticSub") },
  ];

  return (
    <section aria-label={t("trustLabel")} className="border-y border-line bg-bg-primary">
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-6 px-gutter py-7 lg:grid-cols-4 lg:divide-x lg:divide-line lg:py-8 rtl:lg:divide-x-reverse">
        {items.map(({ Icon, title, sub }, i) => (
          <Reveal as="li" key={title} delay={i * 90} className="flex items-start gap-3 lg:justify-center lg:px-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-olive-wash text-olive">
              <Icon size={19} strokeWidth={1.5} />
            </span>
            <div>
              <p className="font-inter text-sm font-semibold leading-snug text-cream">{title}</p>
              <p className="mt-0.5 font-inter text-xs leading-snug text-muted">{sub}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
