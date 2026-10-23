import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { BUSINESS } from "@/lib/site";
import { breadcrumbJsonLd, buildMetadata, pagePath } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return buildMetadata({ locale, path: "/data-deletion", title: t("seoDeletionTitle"), description: t("seoDeletionDescription") });
}

export default async function DataDeletionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const tSeo = await getTranslations("seo");
  const steps = t.raw("deletionSteps") as string[];

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-32 sm:px-8 sm:pt-36">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: tSeo("home"), path: pagePath(locale) },
          { name: t("deletion"), path: pagePath(locale, "/data-deletion") },
        ])}
      />
      <h1 className="font-playfair text-4xl font-bold text-cream sm:text-5xl">{t("deletionTitle")}</h1>
      <p className="mt-2 font-inter text-xs text-cream-secondary/60">{t("updated")}</p>
      <p className="mt-5 font-inter text-lg leading-relaxed text-cream-secondary">{t("deletionLead")}</p>
      <ol className="mt-8 list-decimal space-y-4 ps-6 font-inter leading-loose text-cream-secondary/90 marker:text-terracotta">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="mt-8 font-inter">
        <a href={`mailto:${BUSINESS.email}?subject=Data%20deletion%20request`} className="text-terracotta hover:underline">
          {BUSINESS.email}
        </a>
      </p>
      <p className="mt-6 font-inter text-sm leading-relaxed text-cream-secondary/70">{t("deletionNote")}</p>
    </div>
  );
}
