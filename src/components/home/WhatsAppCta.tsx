import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { KufiyaDivider } from "@/components/ui/KufiyaDivider";
import { KufiyaNet } from "@/components/ui/KufiyaNet";
import { Reveal } from "@/components/ui/Reveal";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";

/** Closing call to action before the footer: talk to us on WhatsApp. */
export async function WhatsAppCta() {
  const t = await getTranslations("home");
  const href = buildWhatsAppOrderLink(t("whatsappGreeting"));
  return (
    <section className="px-gutter pb-section">
      <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-panel bg-bg-secondary px-6 py-12 text-center shadow-card ring-1 ring-line sm:px-12 sm:py-16">
        <KufiyaNet className="pointer-events-none absolute inset-0 text-olive opacity-[0.08]" />
        <div className="relative flex flex-col items-center">
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-forest text-on-accent shadow-glow-forest">
            <MessageCircle size={26} strokeWidth={1.75} />
          </span>
          <h2 className="font-playfair text-h2 font-bold text-cream text-balance">{t("ctaTitle")}</h2>
          <KufiyaDivider size="sm" className="mt-3" />
          <p className="mx-auto mt-4 max-w-lg font-inter text-base leading-relaxed text-cream-secondary">{t("ctaBody")}</p>
          <Button href={href} target="_blank" rel="noopener noreferrer" variant="whatsapp" size="lg" className="mt-7 w-full sm:w-auto">
            <MessageCircle size={20} />
            {t("ctaButton")}
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
