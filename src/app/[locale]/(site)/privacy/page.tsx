import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, buildMetadata, pagePath } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return buildMetadata({ locale, path: "/privacy", title: t("seoPrivacyTitle"), description: t("seoPrivacyDescription") });
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const tSeo = await getTranslations("seo");
  const sections = t.raw("privacySections") as { h: string; p: string }[];

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-32 sm:px-8 sm:pt-36">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: tSeo("home"), path: pagePath(locale) },
          { name: t("privacy"), path: pagePath(locale, "/privacy") },
        ])}
      />
      <h1 className="font-playfair text-4xl font-bold text-cream sm:text-5xl">{t("privacyTitle")}</h1>
      <p className="mt-2 font-inter text-xs text-cream-secondary/60">{t("updated")}</p>
      <p className="mt-5 font-inter text-lg leading-relaxed text-cream-secondary">{t("privacyLead")}</p>
      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="mb-2 font-playfair text-2xl font-bold text-cream">{s.h}</h2>
            <p className="font-inter leading-loose text-cream-secondary/90">{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
