import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Mail, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Band } from "@/components/ui/Band";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { InstagramIcon, FacebookIcon } from "@/components/ui/SocialIcons";
import { JsonLd } from "@/components/seo/JsonLd";
import { BUSINESS } from "@/lib/site";
import { breadcrumbJsonLd, buildMetadata, categoryPath, organizationGraph, pagePath } from "@/lib/seo";
import { buildWhatsAppOrderLink, formatWhatsAppNumberForDisplay } from "@/lib/whatsapp";
import { getCachedCategories } from "@/lib/supabase/queries";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return buildMetadata({ locale, path: "/about", title: t("aboutTitle"), description: t("aboutDescription") });
}

/** "What we offer": each offering links to the store category that holds it.
 * A card only renders when its category exists in the database. */
const OFFERS: { category: string; icon: React.ReactNode }[] = [
  {
    category: "palestine-tshirts",
    icon: (
      <path d="M17 8 L24 12 L31 8 L40 13 L37 21 L33 19 V40 H15 V19 L11 21 L8 13 Z M21 10 Q24 15 27 10" />
    ),
  },
  {
    category: "dresses-abayas",
    icon: (
      <g>
        <path d="M24 6 L42 24 L24 42 L6 24 Z" />
        <path d="M24 14 L34 24 L24 34 L14 24 Z" />
        <path d="M24 20 L28 24 L24 28 L20 24 Z" />
      </g>
    ),
  },
  {
    category: "wall-decorations",
    icon: (
      <g>
        <rect x="8" y="10" width="32" height="28" rx="1.5" />
        <rect x="13" y="15" width="22" height="18" />
        <path d="M13 29 L20 22 L25 27 L29 23 L35 29" />
      </g>
    ),
  },
  {
    category: "accessories",
    icon: (
      <g>
        <path d="M12 6 Q24 20 36 6" />
        <circle cx="24" cy="30" r="9" />
        <path d="M24 21 V18 M20.5 30 L24 26.5 L27.5 30 L24 33.5 Z" />
      </g>
    ),
  },
  {
    category: "palestinian-food",
    icon: (
      <g>
        <path d="M6 24 H42 Q40 38 24 38 Q8 38 6 24 Z" />
        <path d="M18 18 Q16 14 19 10 M24 18 Q22 13 25 9 M30 18 Q28 14 31 10" />
      </g>
    ),
  },
];

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tSeo, tHome, categories] = await Promise.all([
    getTranslations("about"),
    getTranslations("seo"),
    getTranslations("home"),
    getCachedCategories().catch(() => []),
  ]);
  const offerNames = t.raw("offerItems") as string[];
  const steps = t.raw("steps") as string[];
  const keys = new Set(categories.map((c) => c.key));
  const offers = OFFERS.map((o, i) => ({ ...o, name: offerNames[i] })).filter((o) => o.name && keys.has(o.category));
  const whatsappHref = buildWhatsAppOrderLink(tHome("whatsappGreeting"));

  const contactBtn =
    "group flex min-h-16 items-center gap-4 rounded-card bg-surface p-4 ring-1 ring-line transition-[box-shadow,transform] duration-500 ease-soft hover:-translate-y-0.5";

  return (
    <>
      <JsonLd
        data={[
          organizationGraph(locale),
          breadcrumbJsonLd([
            { name: tSeo("home"), path: pagePath(locale) },
            { name: tSeo("about"), path: pagePath(locale, "/about") },
          ]),
        ]}
      />

      {/* ── Header: same calm language as the homepage hero ── */}
      <section className="hero hero-mini" aria-labelledby="about-title">
        <div className="hero-inner">
          <Image src="/images/hattah-logo-400.webp" alt="HATTAH — حَطّة" width={88} height={88} priority className="hero-logo" />
          <h1 id="about-title" className="hero-title hero-title-mini font-playfair">
            {t("title")}
          </h1>
          <p className="hero-sub fade-soft">{t("lead")}</p>
        </div>
      </section>

      {/* ── Who we are: one centred reading column ── */}
      <Band tone="plain" labelledBy="about-who" className="py-section">
        <div className="mx-auto max-w-[45rem] px-gutter text-center">
          <Reveal>
            <SectionHeading id="about-who" title={t("whoTitle")} align="center" className="!mb-7" />
          </Reveal>
          {/* often the LCP element on phones → CSS fade, not a scroll reveal */}
          <p className="fade-soft font-inter text-lg leading-loose text-cream-secondary">{t("who")}</p>
        </div>
      </Band>

      {/* ── What we offer ── */}
      {offers.length > 0 && (
        <Band tone="cream" labelledBy="about-offer" className="py-section">
          <div className="mx-auto max-w-7xl px-gutter">
            <Reveal>
              <SectionHeading id="about-offer" title={t("offerTitle")} align="center" />
            </Reveal>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
              {offers.map((o, i) => (
                <Reveal as="li" key={o.category} delay={i * 80}>
                  <Link
                    href={categoryPath(o.category) as "/category/[key]"}
                    className="group flex h-full flex-col rounded-tile bg-surface p-6 shadow-card ring-1 ring-line transition-[box-shadow,transform] duration-500 ease-soft hover:-translate-y-1"
                  >
                    <svg
                      viewBox="0 0 48 48"
                      width="44"
                      height="44"
                      fill="none"
                      stroke="var(--color-terracotta)"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      {o.icon}
                    </svg>
                    <span className="mt-5 font-playfair text-h3 font-bold text-cream">{o.name}</span>
                    <span className="mt-auto pt-4">
                      <ArrowRight
                        size={16}
                        aria-hidden
                        className="text-cream transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
                      />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </div>
        </Band>
      )}

      {/* ── How to order ── */}
      <Band tone="cream" id="order" labelledBy="about-order" className="scroll-mt-24 py-section">
        <div className="mx-auto max-w-5xl px-gutter">
          <Reveal>
            <SectionHeading id="about-order" title={t("orderTitle")} align="center" />
          </Reveal>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal as="li" key={i} delay={i * 110} className="relative rounded-tile bg-surface p-6 text-center ring-1 ring-line">
                <span
                  aria-hidden
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-full font-bold text-cream ring-1 ring-line-strong"
                  style={{ fontFamily: "var(--font-brand), Georgia, serif", fontSize: "1.5rem" }}
                >
                  {i + 1}
                </span>
                <span className="sr-only">{t("step", { n: i + 1 })}: </span>
                <p className="mt-4 font-playfair text-h3 font-bold text-cream">{s}</p>
              </Reveal>
            ))}
          </ol>
          <Reveal className="mt-8 text-center">
            <p className="font-inter text-cream-secondary">{t("orderNote")}</p>
            <Button href={whatsappHref} target="_blank" rel="noopener noreferrer" variant="whatsapp" size="lg" className="mt-5">
              <MessageCircle size={20} />
              {tHome("finalButton")}
            </Button>
          </Reveal>
        </div>
      </Band>

      {/* ── Contact ── */}
      <Band tone="deep" labelledBy="about-contact" className="py-section">
        <div className="mx-auto max-w-5xl px-gutter">
          <Reveal>
            <SectionHeading id="about-contact" title={t("contactTitle")} align="center" />
          </Reveal>
          <Reveal className="grid gap-3 sm:grid-cols-2">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={contactBtn}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest text-on-accent">
                <MessageCircle size={20} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-inter text-xs text-muted">{t("contactWhatsapp")}</span>
                <span dir="ltr" className="font-inter font-semibold text-cream group-hover:text-terracotta">
                  {formatWhatsAppNumberForDisplay()}
                </span>
              </span>
            </a>
            <a href={`mailto:${BUSINESS.email}`} className={contactBtn}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-cream ring-1 ring-line-strong">
                <Mail size={20} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-inter text-xs text-muted">{t("contactEmail")}</span>
                <span className="truncate font-inter font-semibold text-cream group-hover:text-terracotta">{BUSINESS.email}</span>
              </span>
            </a>
            <a href={BUSINESS.instagram} target="_blank" rel="me noopener noreferrer" className={contactBtn}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-cream ring-1 ring-line-strong">
                <InstagramIcon width={20} height={20} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-inter text-xs text-muted">Instagram</span>
                <span dir="ltr" className="truncate font-inter font-semibold text-cream group-hover:text-terracotta">
                  @hattah.store.co
                </span>
              </span>
            </a>
            <a href={BUSINESS.facebook} target="_blank" rel="me noopener noreferrer" className={contactBtn}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-cream ring-1 ring-line-strong">
                <FacebookIcon width={20} height={20} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-inter text-xs text-muted">Facebook</span>
                <span className="truncate font-inter font-semibold text-cream group-hover:text-terracotta">HATTAH</span>
              </span>
            </a>
          </Reveal>
          <Reveal className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <Button href="/shop" variant="primary" size="lg">
              {t("cta")}
              <ArrowRight size={18} className="btn-arrow rtl:-scale-x-100" />
            </Button>
            <Button href="/faq" variant="secondary" size="lg">
              {t("faqLink")}
            </Button>
          </Reveal>
        </div>
      </Band>
    </>
  );
}
