import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";

/** Closing banner: one short line and the WhatsApp button. The page thread
 * makes its single green stitch here (data-stitch="green"). */
export async function FinalCta() {
  const t = await getTranslations("home");
  const href = buildWhatsAppOrderLink(t("whatsappGreeting"));
  return (
    <section data-stitch="green" className="cv-auto bg-bg-primary px-gutter py-section">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-playfair text-[clamp(2.1rem,1.4rem+3vw,3.8rem)] font-bold leading-[1.2] text-cream text-balance">
          {t("finalTitle")}
        </h2>
        <p className="mx-auto mt-5 max-w-lg font-inter text-base leading-relaxed text-cream-secondary sm:text-lg">{t("finalBody")}</p>
        <Button href={href} target="_blank" rel="noopener noreferrer" variant="whatsapp" size="lg" className="mt-9 min-h-14 w-full px-10 text-lg sm:w-auto">
          <MessageCircle size={22} />
          {t("finalButton")}
        </Button>
      </Reveal>
    </section>
  );
}
