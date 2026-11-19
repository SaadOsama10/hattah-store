import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { KufiyaNet } from "@/components/ui/KufiyaNet";
import { Reveal } from "@/components/ui/Reveal";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";

/** Closing banner: a wide deep panel with a slowly drifting glow, the kufiya
 * net, one strong line and the big WhatsApp button. */
export async function FinalCta() {
  const t = await getTranslations("home");
  const href = buildWhatsAppOrderLink(t("whatsappGreeting"));
  return (
    <section className="cv-auto px-gutter pb-section pt-[calc(var(--spacing-section)*0.5)]">
      <Reveal className="mx-auto max-w-6xl">
        <div
          data-theme="dark"
          className="band-deep relative isolate overflow-hidden rounded-panel px-6 py-16 text-center text-cream shadow-lift sm:px-14 sm:py-20"
        >
        <div aria-hidden className="cta-glow pointer-events-none absolute -z-10" />
        <KufiyaNet className="band-pattern pointer-events-none absolute inset-0 -z-10 text-gold-line" />
        <div aria-hidden className="band-grain pointer-events-none absolute inset-0 -z-10" />
        <h2 className="mx-auto max-w-2xl font-playfair text-[clamp(2.1rem,1.4rem+3vw,3.8rem)] font-bold leading-[1.2] text-cream text-balance">
          {t("finalTitle")}
        </h2>
        <span aria-hidden className="gold-rule mx-auto mt-5" />
        <p className="mx-auto mt-5 max-w-lg font-inter text-base leading-relaxed text-cream-secondary sm:text-lg">{t("finalBody")}</p>
        <Button href={href} target="_blank" rel="noopener noreferrer" variant="whatsapp" size="lg" className="mt-9 min-h-14 w-full px-10 text-lg sm:w-auto">
          <MessageCircle size={22} />
          {t("finalButton")}
        </Button>
        </div>
      </Reveal>
    </section>
  );
}
