import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";
import { TatreezDivider } from "@/components/ui/TatreezDivider";
import { PalestineMapOutline } from "@/components/ui/PalestineMapOutline";
import { GrainOverlay } from "@/components/ui/GrainOverlay";
import { InstagramIcon, FacebookIcon } from "@/components/ui/SocialIcons";
import { buildWhatsAppOrderLink, formatWhatsAppNumberForDisplay } from "@/lib/whatsapp";
import { INSTAGRAM_URL, FACEBOOK_URL } from "@/lib/social";

export function Footer() {
  const t = useTranslations();
  const year = new Date().getFullYear();
  const whatsappHref = buildWhatsAppOrderLink("Hi HATTAH! I have a question.");
  const whatsappDisplay = formatWhatsAppNumberForDisplay();

  return (
    <footer className="relative overflow-hidden border-t border-cream/10 bg-bg-secondary">
      <GrainOverlay opacity="opacity-[0.03]" />
      <PalestineMapOutline
        aria-hidden
        className="pointer-events-none absolute -end-8 -top-10 hidden h-64 text-forest opacity-[0.06] md:block"
      />
      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col items-start gap-4">
            <Logo size="md" />
            <p className="font-inter text-sm leading-relaxed text-cream-secondary/70">
              {t("footer.tagline")}
            </p>
          </div>

          <div>
            <h4 className="mb-5 font-inter text-xs uppercase tracking-[0.2em] text-terracotta">
              {t("footer.quickLinks")}
            </h4>
            <ul className="space-y-3 font-inter text-sm text-cream-secondary/80">
              <li>
                <Link href="/" className="transition-colors hover:text-cream">
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link href="/shop" className="transition-colors hover:text-cream">
                  {t("nav.shop")}
                </Link>
              </li>
              <li>
                <Link href="/#our-story" className="transition-colors hover:text-cream">
                  {t("nav.about")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 font-inter text-xs uppercase tracking-[0.2em] text-terracotta">
              {t("footer.followUs")}
            </h4>
            <div className="flex gap-4">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/20 text-cream transition-colors duration-300 hover:border-terracotta hover:text-terracotta"
              >
                <InstagramIcon width={18} height={18} />
              </a>
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/20 text-cream transition-colors duration-300 hover:border-terracotta hover:text-terracotta"
              >
                <FacebookIcon width={18} height={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-5 font-inter text-xs uppercase tracking-[0.2em] text-terracotta">
              {t("footer.contactUs")}
            </h4>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 font-inter text-sm text-cream-secondary/80 transition-colors hover:text-cream"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cream/20 text-cream transition-colors duration-300 group-hover:border-forest group-hover:text-forest">
                <MessageCircle size={18} />
              </span>
              <span className="flex flex-col items-start">
                <span className="text-xs uppercase tracking-widest text-cream-secondary/50">
                  {t("footer.whatsapp")}
                </span>
                <span dir="ltr">{whatsappDisplay}</span>
              </span>
            </a>
          </div>
        </div>

        <TatreezDivider className="my-10" />

        <div className="flex flex-col items-center justify-between gap-3 font-inter text-xs text-cream-secondary/50 sm:flex-row">
          <p>
            © {year} HATTAH — حَطّة. {t("footer.rights")}.
          </p>
          <p>{t("footer.madeWith")}</p>
        </div>
      </div>
    </footer>
  );
}
