import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Mail, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Band } from "@/components/ui/Band";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { KufiyaNetDraw, LogoRing, Seal } from "@/components/ui/BrandArt";
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
    "group flex min-h-16 items-center gap-4 rounded-card bg-surface/70 p-4 shadow-card ring-1 ring-line backdrop-blur-md transition-[box-shadow,transform] duration-500 ease-soft hover:-translate-y-0.5 hover:shadow-glow-gold";

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

      {/* ── Mini cinematic header ── */}
      <section className="bh bh-mini" aria-labelledby="about-title">
        <div className="bh-layer bh-glow-wrap" aria-hidden>
          <div className="bh-glow" />
        </div>
        <div className="bh-layer bh-rays-wrap" aria-hidden>
          <div className="bh-rays" />
        </div>
        <KufiyaNetDraw />
        <div className="bh-layer bh-grain" aria-hidden />
        <div className="bh-layer bh-vignette" aria-hidden />
        <div className="bh-content">
          <p className="bh-badge" style={{ animation: "none" }}>
            <span aria-hidden className="bh-badge-line" />
            {t("eyebrow")}
            <span aria-hidden className="bh-badge-line" />
          </p>
          <div className="bh-logo-wrap" style={{ animation: "none" }}>
            <div className="bh-halo" aria-hidden />
            <LogoRing />
            <Image src="/images/hattah-logo-400.webp" alt="HATTAH — حَطّة" width={164} height={164} priority className="bh-logo" />
          </div>
          <h1 id="about-title" className="bh-title font-playfair" style={{ fontSize: "clamp(2.4rem, 5.5vw, 4.6rem)" }}>
            {t("title")}
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed" style={{ color: "var(--bh-text-2)" }}>
            {t("lead")}
          </p>
        </div>
      </section>

      {/* ── Who we are ── */}
      <Band tone="plain" labelledBy="about-who" className="py-section">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-gutter lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <Reveal blur>
            <SectionHeading id="about-who" eyebrow="HATTAH · حَطّة" title={t("whoTitle")} className="!mb-6" />
            <p className="max-w-2xl font-inter text-lg leading-loose text-cream-secondary">{t("who")}</p>
          </Reveal>
          <Reveal delay={120} className="relative mx-auto aspect-square w-full max-w-xs">
            <div aria-hidden className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle,var(--t-gold-glow),transparent_65%)]" />
            <Seal id="about-seal" className="spin-slow relative h-full w-full" />
          </Reveal>
        </div>
      </Band>

      {/* ── What we offer ── */}
      {offers.length > 0 && (
        <Band tone="cream" labelledBy="about-offer" className="py-section">
          <div className="mx-auto max-w-7xl px-gutter">
            <Reveal blur>
              <SectionHeading id="about-offer" eyebrow={t("eyebrow")} title={t("offerTitle")} align="center" />
            </Reveal>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
              {offers.map((o, i) => (
                <Reveal as="li" key={o.category} delay={i * 80}>
                  <Link
                    href={categoryPath(o.category) as "/category/[key]"}
                    className="group flex h-full flex-col rounded-tile bg-surface p-6 shadow-card ring-1 ring-line transition-[box-shadow,transform] duration-500 ease-soft hover:-translate-y-1 hover:shadow-glow-gold"
                  >
                    <svg
                      viewBox="0 0 48 48"
                      width="44"
                      height="44"
                      fill="none"
                      stroke="var(--color-gold-line)"
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
                        className="text-gold transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
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
      <Band tone="pattern" id="order" labelledBy="about-order" className="scroll-mt-24 py-section">
        <div className="mx-auto max-w-5xl px-gutter">
          <Reveal blur>
            <SectionHeading id="about-order" eyebrow={t("eyebrow")} title={t("orderTitle")} align="center" />
          </Reveal>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal as="li" key={i} delay={i * 110} className="relative rounded-tile bg-surface/70 p-6 text-center shadow-card ring-1 ring-line backdrop-blur-md">
                <span
                  aria-hidden
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-full font-bold text-gold ring-1 ring-gold-line/60"
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
          <Reveal blur>
            <SectionHeading id="about-contact" eyebrow={t("eyebrow")} title={t("contactTitle")} align="center" />
          </Reveal>
          <Reveal className="grid gap-3 sm:grid-cols-2">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={contactBtn}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest text-on-accent">
                <MessageCircle size={20} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-inter text-xs text-muted">{t("contactWhatsapp")}</span>
                <span dir="ltr" className="font-inter font-semibold text-cream group-hover:text-gold">
                  {formatWhatsAppNumberForDisplay()}
                </span>
              </span>
            </a>
            <a href={`mailto:${BUSINESS.email}`} className={contactBtn}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-gold ring-1 ring-gold-line/60">
                <Mail size={20} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-inter text-xs text-muted">{t("contactEmail")}</span>
                <span className="truncate font-inter font-semibold text-cream group-hover:text-gold">{BUSINESS.email}</span>
              </span>
            </a>
            <a href={BUSINESS.instagram} target="_blank" rel="me noopener noreferrer" className={contactBtn}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-gold ring-1 ring-gold-line/60">
                <InstagramIcon width={20} height={20} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-inter text-xs text-muted">Instagram</span>
                <span dir="ltr" className="truncate font-inter font-semibold text-cream group-hover:text-gold">
                  @hattah.store.co
                </span>
              </span>
            </a>
            <a href={BUSINESS.facebook} target="_blank" rel="me noopener noreferrer" className={contactBtn}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-gold ring-1 ring-gold-line/60">
                <FacebookIcon width={20} height={20} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-inter text-xs text-muted">Facebook</span>
                <span className="truncate font-inter font-semibold text-cream group-hover:text-gold">HATTAH</span>
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
