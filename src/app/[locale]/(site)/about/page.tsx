import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { BUSINESS } from "@/lib/site";
import { breadcrumbJsonLd, buildMetadata, organizationGraph, pagePath } from "@/lib/seo";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return buildMetadata({ locale, path: "/about", title: t("aboutTitle"), description: t("aboutDescription") });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const tSeo = await getTranslations("seo");
  const phone = BUSINESS.phoneDisplay;

  const sections = [
    { title: t("whoTitle"), body: t("who") },
    { title: t("offerTitle"), body: t("offer") },
    { title: t("deliveryTitle"), body: t("delivery") },
    { title: t("orderTitle"), body: t("order", { phone }) },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-32 sm:px-8 sm:pt-36">
      <JsonLd
        data={[
          organizationGraph(locale),
          breadcrumbJsonLd([
            { name: tSeo("home"), path: pagePath(locale) },
            { name: tSeo("about"), path: pagePath(locale, "/about") },
          ]),
        ]}
      />
      <h1 className="font-playfair text-4xl font-bold text-cream sm:text-5xl">{t("title")}</h1>
      <p className="mt-5 font-inter text-lg leading-relaxed text-cream-secondary">{t("lead")}</p>

      <div className="mt-12 space-y-10">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="mb-3 font-playfair text-2xl font-bold text-cream">{s.title}</h2>
            <p className="font-inter leading-loose text-cream-secondary/90">{s.body}</p>
          </section>
        ))}

        <section>
          <h2 className="mb-3 font-playfair text-2xl font-bold text-cream">{t("contactTitle")}</h2>
          <ul className="space-y-2 font-inter text-cream-secondary/90">
            <li>
              {t("contactPhone")}:{" "}
              <a dir="ltr" href={buildWhatsAppOrderLink("Hi HATTAH!")} className="text-terracotta hover:underline">
                {phone}
              </a>
            </li>
            <li>
              {t("contactEmail")}:{" "}
              <a href={`mailto:${BUSINESS.email}`} className="text-terracotta hover:underline">
                {BUSINESS.email}
              </a>
            </li>
            <li>
              <a href={BUSINESS.instagram} rel="me noopener" target="_blank" className="text-terracotta hover:underline">
                Instagram @hattah.store.co
              </a>
              {" · "}
              <a href={BUSINESS.facebook} rel="me noopener" target="_blank" className="text-terracotta hover:underline">
                Facebook
              </a>
            </li>
          </ul>
        </section>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-4">
        <Button href="/shop" variant="primary">
          {t("cta")}
        </Button>
        <Link href="/faq" className="font-inter text-sm text-terracotta hover:underline">
          {t("faqLink")}
        </Link>
      </div>
    </div>
  );
}
