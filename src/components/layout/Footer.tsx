import { getTranslations } from "next-intl/server";
import { Mail, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";
import { KufiyaDivider } from "@/components/ui/KufiyaDivider";
import { KufiyaNet } from "@/components/ui/KufiyaNet";
import { InstagramIcon, FacebookIcon } from "@/components/ui/SocialIcons";
import { buildWhatsAppOrderLink, formatWhatsAppNumberForDisplay } from "@/lib/whatsapp";
import { BUSINESS } from "@/lib/site";
import type { NavCategory } from "@/components/layout/Header";

const linkClass =
  "inline-flex min-h-10 items-center font-inter text-sm text-cream-secondary transition-colors duration-200 hover:text-gold";
const headClass = "mb-3 font-inter text-eyebrow font-semibold uppercase tracking-[0.22em] text-gold";

export async function Footer({ categories = [], hasOffers = false }: { categories?: NavCategory[]; hasOffers?: boolean }) {
  const t = await getTranslations();
  const year = new Date().getFullYear();
  const whatsappHref = buildWhatsAppOrderLink(t("home.whatsappGreeting"));

  return (
    <footer data-theme="dark" className="band-deep cv-auto relative isolate overflow-hidden text-cream">
      <KufiyaNet className="band-pattern pointer-events-none absolute inset-0 -z-10 text-gold-line" />
      <div aria-hidden className="band-grain pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-line/60 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-gutter pt-16 sm:pt-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* About + social */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Logo size="md" className="ring-1 ring-gold-line/50" />
            <h2 className="mt-5 font-playfair text-xl font-bold text-cream">{t("footer.aboutTitle")}</h2>
            <p className="mt-2 max-w-xs font-inter text-sm leading-relaxed text-cream-secondary">{t("footer.aboutText")}</p>
            <p className="mb-2 mt-5 font-inter text-eyebrow font-semibold uppercase tracking-[0.16em] text-muted">
              {t("footer.socialTitle")}
            </p>
            <div className="flex gap-2">
              <a
                href={BUSINESS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-11 w-11 items-center justify-center rounded-full text-cream ring-1 ring-line-strong transition-colors hover:text-gold hover:ring-gold-line"
              >
                <InstagramIcon width={19} height={19} />
              </a>
              <a
                href={BUSINESS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-11 w-11 items-center justify-center rounded-full text-cream ring-1 ring-line-strong transition-colors hover:text-gold hover:ring-gold-line"
              >
                <FacebookIcon width={19} height={19} />
              </a>
            </div>
          </div>

          {/* Shop */}
          <nav aria-labelledby="footer-shop">
            <h2 id="footer-shop" className={headClass}>
              {t("footer.categoriesTitle")}
            </h2>
            <ul>
              <li>
                <Link href="/shop" className={linkClass}>
                  {t("footer.allProducts")}
                </Link>
              </li>
              {hasOffers && (
                <li>
                  <Link href="/offers" className={linkClass}>
                    {t("nav.offers")}
                  </Link>
                </li>
              )}
              {categories.map((c) => (
                <li key={c.key}>
                  <Link href={c.href as "/category/[key]"} className={linkClass}>
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Information / policies */}
          <nav aria-labelledby="footer-info">
            <h2 id="footer-info" className={headClass}>
              {t("footer.linksTitle")}
            </h2>
            <ul>
              <li>
                <Link href="/about" className={linkClass}>
                  {t("seo.about")}
                </Link>
              </li>
              <li>
                <Link href="/about#order" className={linkClass}>
                  {t("nav.howToOrder")}
                </Link>
              </li>
              <li>
                <Link href="/returns" className={linkClass}>
                  {t("nav.returns")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className={linkClass}>
                  {t("seo.faq")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={linkClass}>
                  {t("legal.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/data-deletion" className={linkClass}>
                  {t("legal.deletion")}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <div className="col-span-2 md:col-span-1">
            <h2 className={headClass}>
              {t("footer.contactTitle")}
            </h2>
            <ul className="space-y-3">
              <li>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest text-on-accent">
                    <MessageCircle size={18} />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-inter text-xs text-muted">{t("footer.whatsapp")}</span>
                    <span dir="ltr" className="font-inter text-sm font-semibold text-cream transition-colors group-hover:text-gold">
                      {formatWhatsAppNumberForDisplay()}
                    </span>
                  </span>
                </a>
              </li>
              <li>
                <a href={`mailto:${BUSINESS.email}`} className="group flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-cream ring-1 ring-line-strong">
                    <Mail size={18} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-inter text-xs text-muted">{t("footer.email")}</span>
                    <span className="truncate font-inter text-sm font-semibold text-cream transition-colors group-hover:text-gold">
                      {BUSINESS.email}
                    </span>
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <KufiyaDivider className="mb-8 mt-14" />

        <div className="flex flex-col items-center justify-between gap-2 text-center font-inter text-xs text-muted sm:flex-row">
          <p>
            © {year} HATTAH — حَطّة. {t("footer.rights")}.
          </p>
          <p>{t("footer.madeWith")}</p>
        </div>
      </div>

      {/* Watermark: the wordmark at screen width, barely visible */}
      <p
        aria-hidden
        dir="ltr"
        className="pointer-events-none mt-6 select-none whitespace-nowrap text-center font-bold leading-[0.78] text-cream/[0.05]"
        style={{ fontFamily: "var(--font-brand), Georgia, serif", fontSize: "clamp(4.5rem, 20.5vw, 21rem)", letterSpacing: "0.04em", marginBottom: "-0.1em" }}
      >
        HATTAH
      </p>
    </footer>
  );
}
